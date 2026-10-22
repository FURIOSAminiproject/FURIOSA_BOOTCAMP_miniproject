#!/usr/bin/env bash
# EC2에서 실행한다. 런타임 코드를 runner checkout 밖에 복사해 다음 checkout에도 유지한다.
# 이 스크립트의 실행은 자동 폐기 timer 설치·활성화를 의미한다.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "sudo bash CI_CD/certificates/install_monitor.sh 로 실행하세요." >&2
    exit 1
fi
for COMMAND in python3 openssl docker systemctl flock install; do
    command -v "$COMMAND" >/dev/null || { echo "필요한 명령: $COMMAND" >&2; exit 1; }
done
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE=/etc/travel-certificates/monitor.json
install -d -m 700 /etc/travel-certificates
if [ ! -f "$CONFIG_FILE" ]; then
    install -m 600 "$SOURCE_DIR/monitor.example.json" "$CONFIG_FILE"
fi

# FRONTEND_URL이 localhost/IP이거나 DNS 검사가 불확실하면 timer를 켜지 않는다.
# 이 명령은 --apply 없이 실행하므로 CA 요청·Nginx 재시작·관측 파일 변경을 하지 않는다.
python3 "$SOURCE_DIR/monitor_certificates.py" --config "$CONFIG_FILE"
CERT_CONFIG_DIR="$(python3 - "$SOURCE_DIR" "$CONFIG_FILE" <<'PY'
from pathlib import Path
import sys
sys.path.insert(0, sys.argv[1])
import monitor_certificates as monitor
policy = monitor.Policy.load(Path(sys.argv[2]))
monitor.frontend_supports_markers(policy.frontend_container)
print(policy.config_dir)
PY
)"

# 수동 IP 폐기와 주기 감시가 쓰는 것과 같은 잠금이다. 실행 중인 CA 요청을 중단하지 않는다.
exec 9>> "$CERT_CONFIG_DIR/.travel-ip-revoke.lock"
flock -n 9 || { echo "인증서 작업이 실행 중입니다. 완료 후 다시 설치하세요." >&2; exit 1; }

install -d -m 755 /opt/travel-certificates
for SCRIPT in monitor_certificates.py certificate_dns.py revoke_ip_certificates.py; do
    install -m 644 "$SOURCE_DIR/$SCRIPT" "/opt/travel-certificates/$SCRIPT"
done
install -m 644 "$SOURCE_DIR/systemd/travel-certificate-monitor.service" /etc/systemd/system/
install -m 644 "$SOURCE_DIR/systemd/travel-certificate-monitor.timer" /etc/systemd/system/
systemctl daemon-reload
flock -u 9
systemctl enable --now travel-certificate-monitor.timer
systemctl list-timers --all travel-certificate-monitor.timer
echo "설치 완료. 로그: journalctl -u travel-certificate-monitor.service -n 100 --no-pager"
