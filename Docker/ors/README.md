# 자체 ORS 실행 구성

[ors-config.yml](ors-config.yml)은 동일 OSM 파일로 자동차·도보 경로망을 생성한다.
[루트 Compose 확장](../../docker-compose.ors.yml)은 공식 ORS 이미지 digest를 고정한다.
설정·원본 파일을 읽기 전용으로, 경로망을 버전별 외부 저장소로 마운트한다.

[bootstrap.json](bootstrap.json)은 첫 배포의 다운로드 원본·검증 좌표·포트를 정의한다.
전용 배포 스크립트가 한국 OSM을 검증해 받고 실제 경로·SHA-256을 담은 JSON을 체크아웃 밖에 자동 생성한다.
기존 JSON과 데이터는 재사용한다. 별도 데이터를 지정할 때는 [deployment.example.json](deployment.example.json)에
실제 경로·SHA-256·검증 지점을 입력한다. 예시 그대로 실행하는 설정은 아니다.
필요 자원·실행·CI·실패 복구·현재 연결 범위는 [전용 운영 안내](../../CI_CD/BackEnd/ors/README.md)를 따른다.
