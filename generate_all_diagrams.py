#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
I am your J - 전체 9대 아키텍처 다이어그램 일괄 자동 생성기 & diagrams 폴더 배포
"""

import os
import sys
import time
import shutil
import subprocess

SCRIPTS = [
    ("generate_architecture_diagram.py", "architecture_diagram.png", "1. 종합 클라우드 인프라 아키텍처 (AWS EC2 + Docker + EBS)"),
    ("generate_functional_architecture.py", "functional_architecture.png", "2. 서비스 기능별 5단계 비즈니스 파이프라인"),
    ("diagram_weather_ai.py", "diagram_weather_ai.png", "3. [AI/기상] 딥러닝 기상 예측 앙상블 파이프라인"),
    ("diagram_travel_routing.py", "diagram_travel_routing.png", "4. [여행/경로] ORS 주행경로 및 PostGIS 길목 큐레이션"),
    ("diagram_auth_security.py", "diagram_auth_security.png", "5. [보안/인증] Certbot SSL/TLS 종단 및 네트워크 격리"),
    ("diagram_ai_chat.py", "diagram_ai_chat.png", "6. [AI 플래너] Gemini 3.5 Flash 멀티턴 대화 & 취향 매핑"),
    ("diagram_external_api.py", "diagram_external_api.png", "7. [외부 연동] 4대 공공/상용 API 통합 연동 아키텍처"),
    ("diagram_rdbms_storage.py", "diagram_rdbms_storage.png", "8. [RDBMS 스토리지] PostgreSQL 16 + PostGIS & EBS"),
    ("diagram_cicd_deployment.py", "diagram_cicd_deployment.png", "9. [CI/CD 배포] GitHub Actions & Self-Hosted Runner 무중단 배포"),
]

def main():
    print("=" * 80)
    print("  [I am your J] 전체 9대 고해상도 아키텍처 다이어그램 일괄 생성 및 diagrams 폴더 복사")
    print("=" * 80)
    
    total_start = time.time()
    dest_dir = "diagrams"
    os.makedirs(dest_dir, exist_ok=True)

    success_count = 0
    results = []

    for idx, (script_name, output_image, title) in enumerate(SCRIPTS, 1):
        print(f"\n[{idx}/9] 실행 중: {script_name}...")
        t0 = time.time()
        
        try:
            res = subprocess.run(
                [sys.executable, script_name],
                capture_output=True,
                text=True,
                check=True
            )
            elapsed = time.time() - t0
            
            if os.path.exists(output_image):
                size_kb = os.path.getsize(output_image) / 1024
                # diagrams 폴더로 복사 (윈도우 파일 잠금 대비 재시도 및 바이너리 폴백)
                dest_file = os.path.join(dest_dir, output_image)
                copied = False
                for _ in range(10):
                    try:
                        shutil.copy2(output_image, dest_file)
                        copied = True
                        break
                    except Exception:
                        time.sleep(0.3)
                if not copied:
                    try:
                        with open(output_image, 'rb') as fsrc:
                            data = fsrc.read()
                        with open(dest_file, 'wb') as fdst:
                            fdst.write(data)
                    except Exception as ce:
                        print(f"  [경고] 복사 실패: {ce}")
                print(f"  --> [성공] {output_image} -> {dest_file} ({size_kb:.1f} KB, 소요: {elapsed:.2f}초)")
                success_count += 1
                results.append((title, dest_file, f"{size_kb:.1f} KB", "SUCCESS"))
            else:
                print(f"  --> [오류] 출력 파일이 생성되지 않음: {output_image}")
                results.append((title, output_image, "-", "FILE_NOT_FOUND"))
        except subprocess.CalledProcessError as e:
            print(f"  --> [실패] {script_name} 실행 에러:")
            print(e.stderr)
            results.append((title, output_image, "-", "ERROR"))

    total_elapsed = time.time() - total_start
    print("\n" + "=" * 80)
    print(f"  [최종 리포트] 9개 중 {success_count}개 생성 및 diagrams 폴더 저장 완료! (총 소요시간: {total_elapsed:.2f}초)")
    print("=" * 80)
    for title, path, size, status in results:
        print(f"  * [{status}] {path} ({size}) : {title}")
    print("=" * 80)

if __name__ == "__main__":
    main()
