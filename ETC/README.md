# 기타 자료 및 회의록

## 구성

```text
ETC/
├── 회의록/회의록_Template.md
├── Package_list.txt
└── README.md
```

## 회의록

[회의록 템플릿](회의록/회의록_Template.md)을 복사하고 `YYYY-MM-DD_회의주제.md`로 저장합니다. 진행 상황·결정·다음 과업·담당자·마감 기한을 회의 시점의 사실로 작성합니다. 템플릿의 예시는 실제 완료 내역이나 합의 사항이 아닙니다.

## 패키지 목록

`Package_list.txt`는 Python 환경의 패키지·버전 목록입니다. 전체 프로젝트의 npm 의존성이나 설치 사유를 정리한 문서는 아닙니다. 애플리케이션 설치에는 각 소스의 의존성 정의를 사용합니다.

| 대상 | 설치 기준 |
|---|---|
| FrontEnd | `FrontEnd/v1/package.json`, `package-lock.json` |
| 현재 NestJS 배포 대상 | `BackEnd/NestJS/package.json`, `package-lock.json` |
| FastAPI | `BackEnd/FastAPI/requirements.txt` |

패키지 목록에 있는 라이브러리가 모두 실제 코드에서 사용된다는 의미는 아닙니다.

## 협업 참고

커밋 접두사로 `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore` 등을 사용할 수 있습니다. 실제 비밀번호·API 키·운영 환경 파일은 커밋하지 않습니다. 현재 실행 대상과 배포 경로는 [프로젝트 안내](../README.md) 및 [CI/CD 안내](../CI_CD/README.md)를 확인합니다.
