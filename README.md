# 🎭 Opale

공연에 대한 정보와 교류의 장을 제공하는 공연 정보 통합 플랫폼

---

## 📌 프로젝트 소개

[![Opale 프로젝트 시연](https://img.youtube.com/vi/t-AnrghHGtM/hqdefault.jpg)](https://youtu.be/t-AnrghHGtM)

👉 [클릭하면 시연 영상으로 이동](https://youtu.be/t-AnrghHGtM)

Opale은 공연 정보를 한 곳에서 탐색하고,
사용자 간 소통과 개인화 추천까지 제공하는 **공연 정보 종합 플랫폼 웹앱**입니다.

기존 공연 플랫폼들은
공연 정보, 할인 프로모션, 공연장 위치, 사용자 커뮤니티 기능이 분리되어 있어 사용자가 여러 서비스를 오가야 하는 불편함이 존재했습니다. 
이러한 불편함을 해결하기 위해 공연 정보를 쉽게 얻을 수 있도록 한 곳에 종합하여 제공하고 공연 문화를 활성화시키는 것을 목적으로 합니다. 

이 프로젝트는
**공연 탐색, 공연장 확인, 사용자 소통, 개인화 추천 및 할인 정보 확인**까지
하나의 서비스 안에서 연결된 경험을 제공하는 것을 목표로 개발되었습니다.

공연 및 공연장 정보는 KOPIS 데이터를 기반으로 제공하며,
사용자 행동 기반 콘텐츠 추천, 실시간 채팅, 관리자 운영 기능까지 포함하여
실제 서비스 형태를 고려해 구현했습니다.

---

## 🏗 시스템 아키텍처

<img width="700" alt="Opale Architecture" src="https://github.com/user-attachments/assets/7df2e026-9420-4f09-85fb-67cf72e27b85" />


---

## 🧠 기술 스택

- Frontend: React
- Backend: Spring Boot
- Database: MySQL
- Cache: Redis
- Search: Elasticsearch
- Vector DB: Pinecone
- API: KOPIS API / Naver Map API / OpenAI API
- Communication: WebSocket
- Infra: AWS EC2, Nginx, Docker, Git Action, Netlify
- Crawling: Python 기반 할인 프로모션 크롤링

---

## 🗄️ ERD
(업데이트 진행 중)

<img width="800" alt="ERD_Opale" src="https://github.com/user-attachments/assets/830b0203-e2f4-4b57-ba52-6391737b69cb" />

- 공연(Performance)과 공연장(Place)을 중심으로 예약, 리뷰, 좋아요, 채팅방이 연결되도록 설계했습니다.
- 사용자 행동 로그(user_event_logs)와 선호 벡터(user_preference_vectors)는 추천 시스템의 재료로 활용됩니다.

---

## 🖼 서비스 구조

메인 페이지 → 공연 상세 → 공연장 정보 → 오픈채팅 → 추천 시스템 → AI 공연 챗봇 → 관리자 페이지

- 공연 검색 및 조회 (Elasticsearch + MySQL fallback)
- 공연장 위치 및 지도 확인 (Naver Map)
- 공연별 오픈 채팅방 (WebSocket)
- 사용자 행동 기반 개인화 추천 (Pinecone)
- 자연어 기반 AI 공연 챗봇 (RAG + SSE)
- 할인 프로모션 확인 (크롤링)
- 신고 / 제보 / 관리자 콘텐츠 운영 기능


---

## 🖼 주요 화면

### 메인 페이지
<img width="800" alt="Opale_Main" src="https://github.com/user-attachments/assets/aefddb49-98ac-4c85-978c-14a90463f908" />


### 공연 페이지
<img width="800" alt="Opale_Performance" src="https://github.com/user-attachments/assets/d34b815b-872d-44f4-8967-44a755e7e1f2" />


### 공연장 페이지
<img  width="800" alt="Opale_Place" src="https://github.com/user-attachments/assets/7d48447a-b8af-4a3b-8433-319b21bcaad0" />


### 공연 오픈 채팅
<img width="800" alt="Opale_Chat" src="https://github.com/user-attachments/assets/318eb844-15f9-4c86-b73a-7bebf06ec3bb" />


### 추천 시스템
<img width="800" alt="Opale_Recommend" src="https://github.com/user-attachments/assets/19dcc772-3788-4f5c-b067-a57639252260" />


### 운영자 페이지
<img width="800" alt="Opale_Admin" src="https://github.com/user-attachments/assets/aff469f7-9c8b-4a3a-a695-48244d9e5ca4" />


---

## 🚀 주요 기능

### 1️⃣ 공연 및 공연장 정보 제공
- KOPIS API 기반 실제 공연/공연장 데이터 적재
- 공연 상세 정보, 공연장 정보, 공연 기간/장르/출연진 등 주요 정보 제공

### 2️⃣ Elasticsearch 기반 공연 검색
- 오타 허용(fuzziness) + 부분 검색 + 자동완성 지원
- Nori 형태소 분석기를 적용해 한국어 검색 품질 개선
- Elasticsearch 장애 시 MySQL LIKE 쿼리로 자동 fallback

### 3️⃣ 공연장 지도 기능
- Naver Map API 기반 공연장 위치 확인
- 지도에서 공연장 상세 정보 조회 가능

### 4️⃣ 공연 오픈 채팅
- 공연별 오픈 채팅방 제공
- WebSocket 기반 실시간 채팅 구현
- 비로그인 사용자도 메시지 조회 가능, 로그인 사용자만 전송 가능

### 5️⃣ 콘텐츠 기반 개인화 추천
- 사용자 행동 로그(조회, 리뷰 작성, 체류 시간) 기반 선호 벡터 생성
- OpenAI 임베딩(1536차원)으로 공연 특성 벡터화 → Pinecone ANN 쿼리
- 랭킹 레이어: 취향 유사도 60% + 최신성 20% + 인기도 20%
- 신규 유저 온보딩: 장르 선택으로 첫 로그인부터 초기 선호 벡터 생성

### 6️⃣ AI 공연 챗봇 (RAG)
- 자연어 질문 의도를 분류해 키워드 / 시맨틱 / 개인화 / 정보성 쿼리로 라우팅
- Elasticsearch · Pinecone · MySQL을 질의 유형에 맞게 조합해 검색
- 검색된 공연 정보를 근거로 LLM이 스트리밍 답변 생성(SSE)
- 제공된 데이터 범위를 벗어난 내용은 답변하지 않도록 프롬프트 제약 적용

### 7️⃣ 할인 프로모션 크롤링
- 예매처 할인 이벤트 및 프로모션 정보 수집 및 제공
- 공연 관람 전 확인이 필요한 할인 혜택 정보를 한 곳에서 탐색 가능

### 8️⃣ 신고 및 제보
- 리뷰 · 채팅 메시지 신고 접수 및 관리자 승인/반려 처리
- 신고 승인 시 해당 콘텐츠 자동 숨김 및 평점 재계산
- 회원이 공연 할인/좌석/공지 등 정보를 이미지로 제보하면, 관리자 승인 후 공연 상세에 반영

### 9️⃣ 관리자 페이지
- 통계 대시보드: 가입자 추이, 조회수 TOP5, 장르별 분포, 챗봇 쿼리 유형 분포, 인기 검색어
- 공연 상세 정보 및 메인 배너 관리
- 신고/제보 처리 및 서비스 콘텐츠 운영 기능 제공

---

## 🎯 구현 포인트

- **콘텐츠 기반 추천 시스템**  
  조회 · 리뷰 작성 · 체류 시간별로 차등 가중치를 부여해 선호 벡터의 정밀도를 높였습니다.  
  또한 신규 유저도 온보딩 장르 선택을 통해 첫 로그인부터 개인화 추천을 받을 수 있도록 설계했습니다.

- **RAG 기반 AI 공연 챗봇**  
  질의 의도를 분류한 뒤 `Elasticsearch / Pinecone / MySQL` 중 적절한 저장소로 라우팅하고, 검색 결과를 기반으로 LLM이 답변을 생성하도록 파이프라인을 구성했습니다.  
  특히 한국어 검색 품질 문제를 분석한 뒤 `Nori 형태소 분석기`를 도입해 검색 정확도를 개선했습니다.

- **Elasticsearch + MySQL 이중화 검색 구조**  
  검색은 기본적으로 Elasticsearch로 처리하되, 장애 상황에서는 MySQL `LIKE` 쿼리로 자동 전환되도록 구성해 서비스 가용성을 확보했습니다.

- **WebSocket 기반 실시간 채팅**  
  비로그인/로그인 권한을 분리하고, 앱 진입 시점에 소켓을 선제 연결하여 채팅 페이지 진입 전에도 연결 준비가 완료되도록 구현했습니다.

- **신고/제보 운영 플로우 설계**  
  신고 승인 시 콘텐츠 자동 숨김과 평점 재계산이 함께 동작하도록 연동했으며, 제보는 관리자 승인 게이트를 거친 뒤 공연 상세에 반영되도록 구성해 운영 안정성을 높였습니다.

- **KOPIS API 기반 공연 데이터 수집 및 관리**  
  공연/공연장 데이터를 정기적으로 적재하고, 서비스 내부 기능에서 일관되게 활용할 수 있도록 관리 구조를 설계했습니다.

- **관리자 페이지를 통한 운영 기능 통합**  
  통계 대시보드로 서비스 현황을 시각화하고, 공연 정보 수정, 배너 관리, 신고/제보 처리까지 하나의 운영 도구 안에서 수행할 수 있도록 구현했습니다.

---



## 🤝 팀 구성

|  | 송수진 | 조승희 |
|:---:|:---:|:---:|
| **GitHub** | [@soojinsong](https://github.com/soojinsong) | [@J0seunghee](https://github.com/J0seunghee) |
| **Profile** | <img src="https://github.com/soojinsong.png" width="100"> | <img src="https://github.com/J0seunghee.png" width="100"> |
| **담당 역할** | 백엔드 전체 API 개발<br>프론트엔드 공연장 페이지·운영자 페이지·API 연동<br>배포 · CICD · 서버 관리 | 프론트엔드 |



---

## ⚙️ 실행 방법

### 1. 필수 서비스 실행
- MySQL, Redis, Elasticsearch 실행 필요
- docker-compose 또는 로컬 환경에서 실행

### 2. Backend 실행
```bash
# Mac / Linux
./gradlew bootRun

# Windows
.\gradlew.bat bootRun
```

### 3. Frontend 실행
```bash
npm install
npm run dev

```
※ KOPIS API Key, Naver Map API Key, OpenAI API Key, Pinecone API Key가 필요합니다.

※ Backend 실행 후 Frontend 실행을 권장합니다.




