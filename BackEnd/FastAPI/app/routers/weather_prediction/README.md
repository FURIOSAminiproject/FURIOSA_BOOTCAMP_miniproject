기상청 raw data를 1번부터 6번까지의 data preprocessing을 거쳐 1stage Bi-LSTM용 데이터로 가공

# 파일 설명
1_data_preprocessing.py : raw data의 STN(관측 지점)코드를 META_관측지점정보.csv 파일과 대조해서 관측 지점별 csv로 분할(동일한 STN코드가 있을 시 최신 지역이름(ex 전라남도 -> 전남광주통합특별시))

2_weather_preprocessing.py : 1차 data preprocessing코드, 일평균기온, 일최저기온에서 결측치를 전/후일의 데이터 기반으로 보간하였고, 결측치를 유추하지 못하거나 너무 많은 경우(전운량 등) column 삭제

3_weather_drop.py : 2차 data_preprocessing코드, 예측에 필요없는 column(기상 관측을 수행한 시각)과 없어도 되는 column(최대 순간 풍향) 삭제

3.5_wind_feature.py : 최대 풍향의 방위각을 sin과 cos값으로 encoding

4_weather_correlation_review.py : 기상 변수(X)들과 예측 target(TA_AVG, TA_MAX, TA_MIN, WS_AVG, RN_DAY)간의 스피어만 상관계수 계산 후 보고서를 마크다운 형식으로 작성

5_dataset_correlation_threshold.py : 4번에서 만들어진 보고서 바탕으로 계산불가 항목과 상관계수 절댓값이 0.1 미만인 변수 column 삭제

6_dataset_date_feature.py : 최종 데이터셋을 만들기위한 코드, 관측 날짜를 몇월인지 1년중 몇번째 날인지 계산하여 주기성을 나타내기위해 sin과 cos으로 encoding, STN column 삭제

train_models.py : 학습 코드, 2stage (X재귀예측-Y실제예측)으로 구성 사용시 python train_models.py --start-date 2016-01-01

save_model_to_db.py : 데이터베이스(.env에서 환경 읽어옴)에 학습된 모델 저장

predict_weather.py : 추론 코드, 예측하려는 지역과 날짜를 입력받아 6_dataset의 featured data csv파일 및 데이터베이스의 모델 파일을 받아 기상 예측

weather_model.py : train_models.py와 predict_weather.py에서 사용하는 모델들을 미리 구성해놓은 코드