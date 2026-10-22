# EC2 IP·도메인 인증서 자동 폐기 감시

[monitor_certificates.py](monitor_certificates.py)는 이 EC2 전용 Certbot 보관소의 `live/`를 자동 탐색하고, 사용 종료를 반복 확인한 인증서에 대해 **사용·갱신 차단 → Nginx 재시작 → Let's Encrypt 폐기 요청**을 수행한다. 인증서 이름을 매번 나열할 필요가 없다. 원본 인증서·개인키·계정 파일은 보존한다.

## 판정 기준

- 현재 IP: IMDSv2에서 이 EC2의 모든 ENI에 할당된 공인 IPv4를 조회한다. NAT 출구 IP를 반환할 수 있는 외부 IP 확인 사이트는 사용하지 않는다.
- 현재 도메인: `/home/ec2-user/.env.production`의 `FRONTEND_URL` 호스트를 사용한다. 파일 경로는 설정의 `identity_env`로 바꾼다. 이 파일을 shell로 실행하지 않으며 DB 비밀번호·JWT 등을 출력하지 않는다.
- DNS: 보유 DNS 인증서의 실제 SAN 이름과 현재 서비스 도메인에 대해 Google·Cloudflare의 HTTPS DNS에서 A/AAAA를 조회한다. 두 resolver가 주소 또는 이름 없음에 동의해야 한다. CNAME 연결을 따라가며, 양성 응답 및 NXDOMAIN/NODATA의 SOA 캐시 TTL도 대기 시간에 반영한다. 부재 판정에는 해당 이름을 포함하는 zone의 SOA가 필요하며, 빈 응답·불완전 CNAME·referral만으로 폐기하지 않는다. SOA TTL은 RFC 2308에 따라 레코드 TTL과 MINIMUM 중 작은 값으로 해석한다.
- 파일 이름을 신뢰하지 않고 실제 leaf 인증서 SAN·만료·발급 CA·원래 계정을 검사한다. **단일 DNS 또는 단일 공인 IPv4 인증서**만 자동 처리한다. 와일드카드·여러 SAN·IPv6·다른 CA·손상된 파일은 처리하지 않으며 로그로 구분한다.

| 관측 결과 | 동작 |
|---|---|
| IP 인증서의 IP가 현재 EC2에 할당됨 | KEEP |
| IP 인증서의 IP가 현재 EC2에서 사라짐 | 반복 확인 후 폐기 |
| 같은 도메인이 현재 EC2 IP를 가리킴 | KEEP. IP가 바뀌어도 도메인 인증서는 유지 |
| 인증서 도메인이 FRONTEND_URL과 다름 | 새 FRONTEND_URL 도메인이 이 EC2를 가리키는 것을 확인한 뒤, 이전 이름을 사용 종료로 처리 |
| 현재 도메인의 주소가 없거나 모두 다른 IPv4를 가리킴 | `direct_dns=true`일 때 반복 확인 후 폐기 |
| IMDS 실패·공인 IPv4 없음·DNS timeout/SERVFAIL·TLS 검증 실패·resolver 불일치 | DEFER. 연속 관측을 초기화하고 신규 폐기를 보류 |
| AAAA 주소가 존재함 | 현재 구현에서 EC2 IPv6를 검증하지 않으므로 DNS 인증서 판정 보류 |
| 이미 폐기 시작한 동일 leaf | 차단을 유지하고 원격 요청 재시도. DNS가 복구됐다고 재사용하지 않음 |
| 이미 CA 폐기 성공을 기록함 | 요청을 반복하지 않고 필요한 로컬 차단·Nginx 동기화만 수행 |

DNS 매핑은 법적 소유권 증명이 아니다. 이 도구는 **EC2 한 대에 직접 연결하는 단일 사이트의 사용 정책**을 검사한다. 다른 사이트/서버와 인증서 보관소나 인증서를 공유한다면 자동 탐색을 그대로 사용하지 않는다. Cloudflare 프록시·CDN·ALB 뒤로 옮길 때에는 `direct_dns=false`로 설정해 DNS 불일치 자동 폐기를 중단하고 배포 구조에 맞게 정책을 수정한다.

## 반복 확인과 실패 처리

기본값은 3회 이상 같은 관측, 최초 관측부터 최소 900초(15분) 경과다. timer는 부팅 2분 후 시작하고 실행 완료 후 약 5분마다 호출한다. 따라서 보통 첫 관측 이후 네 번째 점검에서 15분 조건을 만족하며, 긴 DNS TTL에 따라 더 기다릴 수 있다. 900초 넘는 관측 공백·시계 역행·인증서 교체·DNS 복구·도메인/IP 변경은 기존 연속 확인을 초기화한다.

관측은 `/etc/letsencrypt/.travel-certificate-monitor.json`에 원자적으로 저장한다. 적용 직전에는 IP·FRONTEND_URL·DNS·leaf·renewal 설정을 다시 확인한다. 수동 IP 도구와 같은 파일 잠금을 사용한다. 별도 Certbot 발급·갱신 전체를 잠그는 것은 아니므로 운영자가 외부 작업을 병행할 때는 timer를 중지하고 서비스 완료를 기다린다.

폐기에는 기존 [수동 도구](revoke_ip_certificates.py)의 원래 ACME 계정·공개 인증서 사본·원자적 marker·`autorenew = False` 처리를 재사용한다. `.travel-ip-disabled.sha256`과 `.travel-ip-revoked.sha256`이라는 기존 이름은 호환성을 위해 DNS 인증서에도 사용한다. 전자는 폐기 의도, 후자는 CA 성공 확인을 뜻한다. 일반 오류나 timeout은 성공으로 기록하지 않고 다음 점검에서 재시도한다. CA가 명시한 `alreadyRevoked`도 성공으로 처리한다.

새 차단 marker가 생기면 `travel-frontend`를 재시작해 실행 중인 인증서 제공도 중단한다. 재시작 실패는 오류로 남기며 CA 요청은 계속하고, Nginx 동기화는 다음 점검에서 다시 시도한다. **차단 leaf를 제외하는 최신 진입점이 필요하며 재시작 중 짧은 중단이 생길 수 있다.** 다른 인증서가 없으면 기존 진입점 정책에 따라 HTTP 모드가 된다. 이미 만료된 인증서에는 새 원격 폐기를 요청하지 않는다.

## 설치 전 운영 설정

EC2 호스트에 Python 3.9 이상(`/usr/bin/python3`), OpenSSL, Docker, systemd, `flock`이 필요하다. Google/Cloudflare DNS와 Let's Encrypt에 HTTPS로 연결할 수 있어야 하며 인증서 검증을 끄지 않는다.

영구 환경 파일에는 다음과 같이 실제 HTTPS 도메인이 있어야 한다.

```dotenv
FRONTEND_URL=https://roadfriendtrip.freeddns.org
```

`localhost`, 공인 IP 문자열, HTTP, 하위 경로가 들어간 FRONTEND_URL은 감시 기준으로 사용하지 않는다. 이전 대화의 IP URL이 남아 있다면 먼저 환경 파일을 수정한다. 이 감시 도구가 환경변수를 컨테이너에 주입하거나 OAuth 콜백 설정을 바꾸지는 않는다.

frontend에는 [진입점](../../FrontEnd/v1/docker-entrypoint.sh)의 폐기 leaf 제외 기능이 반영되어 있어야 한다. 이미지가 오래됐다면 올바른 환경 파일을 준비하고 frontend만 빌드·재생성한다. 기존 backend/fastapi를 재생성할 필요는 없다.

```bash
APP_ENV=production docker compose build frontend
APP_ENV=production docker compose up -d --no-deps frontend
```

## 설치·활성화

최신 코드를 EC2 저장소에 반영한 뒤 저장소 루트에서 실행한다. **설치 스크립트를 실행하면 자동 폐기 timer가 활성화된다.** 실제 CA 폐기는 이후 반복 관측 조건을 만족할 때 수행한다.

```bash
sudo bash CI_CD/certificates/install_monitor.sh
```

[설치 스크립트](install_monitor.sh)는 [monitor.example.json](monitor.example.json)을 `/etc/travel-certificates/monitor.json`에 처음 한 번 복사하고, 기존 설정은 보존한다. 읽기 전용 사전 검사와 frontend 진입점 검사를 통과한 뒤 런타임 코드를 `/opt/travel-certificates/`에 복사한다. timer는 GitHub runner 작업 폴더가 아닌 이 경로를 사용하므로 checkout cleanup의 영향을 받지 않는다.

설정을 먼저 조정하려면 다음과 같이 준비한 후 설치한다.

```bash
sudo install -d -m 700 /etc/travel-certificates
sudo install -m 600 CI_CD/certificates/monitor.example.json /etc/travel-certificates/monitor.json
sudo nano /etc/travel-certificates/monitor.json
sudo bash CI_CD/certificates/install_monitor.sh
```

코드를 업데이트한 뒤에는 설치 스크립트를 다시 실행해야 `/opt` 사본에 반영된다. 실행 중인 인증서 작업이 잠금을 보유하면 기존 작업을 중단하거나 덮어쓰지 않고 설치를 중단한다. 설정 파일이 바뀌면 다음 실행에서 읽으며, 실행 중인 점검에는 이미 읽은 정책이 적용된다.

## 점검·로그·중지

```bash
# 읽기 전용. CA 요청, Nginx 재시작, 관측 파일 변경 없음
sudo python3 /opt/travel-certificates/monitor_certificates.py

sudo systemctl list-timers --all travel-certificate-monitor.timer
sudo journalctl -u travel-certificate-monitor.service -n 100 --no-pager

# 수동으로 한 번 실행: 반복 확인 조건과 실패한 폐기 재시도를 적용함
sudo systemctl start travel-certificate-monitor.service

# 향후 주기 실행 중지. 이미 시작한 폐기 요청은 취소하지 않음
sudo systemctl disable --now travel-certificate-monitor.timer
sudo systemctl status travel-certificate-monitor.service
```

EC2가 꺼져 있을 때에는 실행할 수 없다. 시작 후에는 새 IP를 관측하지만, 완전 종료·EIP 반납 전에는 기존 수동 도구의 `--retire-current-ip` 절차를 사용할 수 있다. 인스턴스와 계정·인증서 파일 자체가 삭제되면 이 timer가 원격에서 대신 요청하지 않는다.

이 도구는 **신규 인증서 발급·정상 인증서 갱신·DDNS IP 갱신 도구가 아니다.** 해당 자동화는 별도 구성해야 한다. 다른 프로그램이 차단 표시를 무시하거나 명시적으로 인증서를 재발급하는 작업까지 통제하지 않는다.

## 검증

```bash
python3 -B -m unittest discover -s CI_CD/certificates/tests -v
bash -n CI_CD/certificates/install_monitor.sh
```

테스트의 CA·AWS·Docker·systemctl·DNS 통신은 모두 모의 처리한다. DNS JSON 파싱, 상태 누적·복구·IP 변경·도메인 변경, CA 실패 재시도, Nginx 재시작 실패, 설치 사전 검사와 잠금 처리를 확인한다. 실제 서버의 systemd 실행·CA 폐기·Docker Nginx TLS는 이 검사로 검증되지 않는다.

- [Let's Encrypt 폐기 권한·사유](https://letsencrypt.org/docs/revoking/)
- [Google DNS HTTPS JSON](https://developers.google.com/speed/public-dns/docs/doh/json)
- [Cloudflare DNS HTTPS JSON](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/)

- [RFC 2308: DNS 부재 응답과 SOA TTL](https://www.rfc-editor.org/rfc/rfc2308.html)
