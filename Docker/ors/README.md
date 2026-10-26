# 자체 ORS 실행 구성

[ors-config.yml](ors-config.yml)은 동일 OSM 파일로 자동차·도보 경로망을 생성한다.
[루트 Compose 확장](../../docker-compose.ors.yml)은 공식 ORS 이미지 digest를 고정한다.
설정·원본 파일을 읽기 전용으로, 경로망을 버전별 외부 저장소로 마운트한다.

[deployment.example.json](deployment.example.json)은 배포 입력 형식이다. 실제 경로·SHA-256과
검증 지점을 지정해 체크아웃 밖에 보관한다. 예시 그대로 실행하는 설정은 아니다.
필요 자원·실행·CI·실패 복구·현재 연결 범위는 [전용 운영 안내](../../CI_CD/BackEnd/ors/README.md)를 따른다.
