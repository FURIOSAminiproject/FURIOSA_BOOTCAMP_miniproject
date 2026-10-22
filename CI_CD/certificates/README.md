# EC2 IP 인증서 폐기 도구

[revoke_ip_certificates.py](revoke_ip_certificates.py)는 EC2에 더 이상 할당되지 않은 IPv4 인증서를 점검하고, 명시적으로 적용할 때 Let’s Encrypt에 폐기를 요청합니다. 이메일을 요구하거나 신규 계정을 만들지 않으며 기존 Certbot 계정을 사용합니다. 대상은 `--cert-name`으로 지정한 lineage로 한정합니다.

## 파일 역할

| 파일 | 용도 |
|---|---|
| revoke_ip_certificates.py | IMDSv2 조회, 인증서 검사, 갱신 차단, 폐기 요청·결과 기록 |
| tests/test_revoke_ip_certificates.py | AWS·CA·Docker 데몬을 호출하지 않는 테스트와 격리된 진입점 실행 |
| ../../FrontEnd/v1/docker-entrypoint.sh | 같은 lineage의 cert/key 선택, 폐기 요청한 leaf 제외 |

## 전제와 범위

- EC2 **호스트**에서 Python 3.9 이상, OpenSSL, Docker를 사용합니다. 컨테이너 내부·Windows 로컬 실행용 도구가 아닙니다.
- `/etc/letsencrypt`에 원래 계정과 인증서·renewal 설정이 남아 있어야 합니다. 다른 경로는 `--config-dir /absolute/path`로 지정합니다. Docker 로그는 호스트 `/var/log/letsencrypt`에 남깁니다.
- IMDSv2의 모든 네트워크 인터페이스별 public-ipv4s를 조회합니다. 보조 인터페이스의 EIP도 현재 사용 중인 주소로 취급합니다. 조회 실패·공인 IPv4 없음·잘못된 응답이면 폐기를 추정하지 않고 실패 종료합니다.
- SAN이 **공인 IPv4 하나만** 포함한 인증서만 처리합니다. DNS·도메인/IP 혼합·여러 IP·IPv6·사설 IP는 제외합니다. Let's Encrypt 운영 서버의 renewal 설정과 기존 account ID를 확인합니다.
- 기본은 읽기 전용 점검입니다. 파일명에 적힌 IP 대신 실제 인증서 SAN을 확인하며, 현재 할당된 IP는 유지합니다. 이미 만료된 인증서는 원격 폐기를 요청하지 않습니다.
- 이 도구는 다른 서버와 공유하는 인증서의 사용 현황까지 알 수 없습니다. 이 EC2 전용 인증서만 대상으로 지정합니다.

## 먼저 새 frontend 이미지를 반영

기존 이미지에는 폐기 표시를 무시하는 이전 진입점이 들어 있을 수 있습니다. 아래 예시는 저장소 루트, production, 기존 DB/API 서비스가 준비된 환경 기준입니다.

```bash
APP_ENV=production docker compose build frontend
APP_ENV=production docker compose up -d --no-deps frontend
```

재생성 중 잠시 접속이 끊길 수 있습니다. 해당 EC2의 실제 SSL_CERT_PATH·CERTBOT_WWW_PATH 환경을 유지합니다. 새 진입점 반영 여부는 이미지에 포함된 `/docker-entrypoint.sh`를 확인합니다. 도구 자체가 frontend를 빌드·배포·재시작하지는 않습니다.

## 점검과 적용

아래 명령은 **저장소 루트**에서 실행합니다. `32.236.200.229`는 대화에서 사용한 lineage 이름의 예시이며 실제 파일명을 확인해 바꿉니다. 이 문서에 해당 IP가 현재도 할당되어 있다는 의미는 없습니다.

```bash
# 기본: 점검만 수행. 파일 변경·CA 요청 없음
sudo python3 CI_CD/certificates/revoke_ip_certificates.py \
  --cert-name 32.236.200.229

# 점검 결과 WOULD REVOKE인 대상에 실제 폐기 요청
sudo python3 CI_CD/certificates/revoke_ip_certificates.py \
  --cert-name 32.236.200.229 --apply
```

`--cert-name`을 반복해 여러 lineage를 지정할 수 있습니다. 잘못된 설정은 적용 전에 검사하지만, 적용 도중 오류가 나면 앞선 대상은 이미 처리됐을 수 있습니다. 종료 코드 0은 요청 대상의 점검/처리가 끝났다는 뜻이고, 1은 확인 또는 처리 실패입니다. 실제 결과는 KEEP/SKIP/WOULD REVOKE/REVOKED 출력으로 구분합니다.

EC2 Stop이나 EIP 해제 **전**에는 IP가 아직 할당되어 있으므로 아래처럼 명시합니다. 이 옵션은 현재 사용 중인 선택 인증서도 폐기하므로 해당 HTTPS 서비스를 종료할 때 사용합니다.

```bash
# 먼저 운영 종료 예정 대상 점검
sudo python3 CI_CD/certificates/revoke_ip_certificates.py \
  --cert-name 32.236.200.229 --retire-current-ip

# 실제 폐기 요청
sudo python3 CI_CD/certificates/revoke_ip_certificates.py \
  --cert-name 32.236.200.229 --retire-current-ip --apply
```

서버가 꺼져 있는 동안 이 도구는 실행될 수 없습니다. Stop/해제 전 실행하거나 시작 후 실행하는 운영 절차와 연결해야 합니다. 이 변경은 타이머·종료 훅을 자동 설치하지 않습니다.

## 폐기와 실패 처리

적용 순서는 다음과 같습니다.

1. IMDS의 IP 목록과 인증서 파일이 점검 이후 바뀌지 않았는지 다시 확인합니다.
2. 선택 lineage에 `.travel-ip-disabled.sha256`을 원자적으로 저장합니다. 값은 leaf cert.pem 파일의 SHA-256입니다.
3. renewal 설정의 `[renewalparams]`에 `autorenew = False`를 반영합니다. 기존 주석·중첩 webroot_map·나머지 설정을 보존합니다.
4. 공식 Certbot 컨테이너로 기존 계정의 `revoke --reason cessationofoperation --no-delete-after-revoke`를 실행합니다. live 링크가 갱신돼도 다른 인증서를 폐기하지 않도록 점검한 공개 인증서 사본을 `.travel-ip-revoke/<해시>.pem`에 저장해 사용합니다. 개인키를 복사하지 않습니다.
5. 성공 또는 CA의 명시적인 alreadyRevoked 응답일 때만 `.travel-ip-revoked.sha256`에 성공을 기록합니다. 같은 leaf의 성공 기록이 있으면 중복 요청하지 않습니다.

네트워크 오류·타임아웃·로컬 기록 실패 시 비정상 종료하며, 이미 만든 차단 표시와 갱신 비활성화는 되돌리지 않습니다. 오류를 조사한 뒤 동일 명령으로 재시도합니다. 타임아웃은 CA 처리 실패를 확정하는 의미가 아니며 컨테이너가 아직 처리 중일 수 있습니다. Certbot 로그와 `docker ps`도 확인합니다. 성공 기록 없이 표시만 지워서 인증서를 재사용하지 않습니다.

같은 lineage에 대해 별도 Certbot 갱신·재설정과 동시에 실행하지 않습니다. 이 도구끼리는 파일 잠금으로 중복 적용을 막지만 Certbot 외부 작업 전체를 잠그지는 않습니다.

## Nginx 반영과 보관

갱신·폐기 명령은 실행 중인 Nginx 메모리의 인증서를 즉시 교체하지 않습니다. **새 진입점이 포함된 이미지**에서 차단 표시를 읽게 하려면 다음을 실행합니다.

```bash
docker restart travel-frontend
docker exec travel-frontend nginx -t
docker logs --tail=50 travel-frontend
```

같은 leaf가 차단되어 있으면 해당 lineage를 제외합니다. 다른 사용 가능한 인증서 쌍이 없으면 HTTP 템플릿으로 시작합니다. 따라서 HTTPS를 중지하는 상황에서는 끊김·HTTP 제공 정책을 운영자가 확인해야 합니다. 다른 인증서가 있다고 현재 IP에 맞는 인증서라는 것까지 보장하지 않습니다.

기존 cert/key/archive 파일은 삭제하지 않습니다. 자동 갱신도 다시 켜지 않습니다. 새 IP용 발급은 별도 작업이며 해당 IP가 실제 할당돼 있는지 확인하고 새 lineage를 사용합니다. 새로 발급한 leaf가 이전 차단 해시와 다르면 진입점에서 선택할 수 있습니다. 이 해시는 로컬 선택 제어용이며 CA 폐기 상태 조회나 인증서 만료 검증을 대신하지 않습니다.

**포함하지 않는 기능:** 신규 발급·일반 갱신의 IP 검증 게이트, 현재 IP에 맞는 인증서의 자동 선택, 자동 스케줄, EC2 종료 이벤트 처리, Nginx 자동 reload/restart. 기존 수동 Certbot 명령이나 별도 자동화가 이 도구를 우회하는 것까지 차단하지 않습니다.

## 주기적인 IP·도메인 감시

[MONITOR.md](MONITOR.md)의 설치 스크립트로 systemd timer를 활성화할 수 있습니다. 이 문서의 수동 도구와 동일한 차단·CA 폐기 처리를 사용하며, FRONTEND_URL과 DNS도 검사합니다. 위의 “포함하지 않는 기능” 목록은 수동 IP 도구의 범위입니다. 감시 설치만으로 신규 발급·정상 갱신·DDNS 갱신이 구성되지는 않습니다.

## 검증

```bash
python3 -B -m unittest discover -s CI_CD/certificates/tests -v
sh -n FrontEnd/v1/docker-entrypoint.sh
```

테스트는 임시 디렉토리를 사용합니다. AWS·CA·Docker 명령은 모킹하고, SAN·만료 파싱은 로컬 생성한 자체 서명 테스트 인증서로도 확인합니다. Nginx 진입점 테스트는 경로를 fixture로 치환하고 nginx를 스텁으로 대체합니다. 실제 EC2 폐기·Certbot 컨테이너·Nginx TLS 연동 검증과 구분합니다.

- [AWS IMDSv2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
- [AWS 인터페이스별 public-ipv4s](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html)
- [Certbot 폐기 옵션](https://eff-certbot.readthedocs.io/en/stable/using.html#revoking-certificates)
