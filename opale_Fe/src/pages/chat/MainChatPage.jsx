/*
메인 채팅 페이지:
 - 검색바: 채팅방명 또는 공연명으로 검색
 - 채팅방 리스트: 공연 공개 채팅방만 표시, 최근 메시지 시간 기준 정렬, 각 방에 아이콘 표시
 - 실시간 업데이트: WebSocket으로 채팅방 업데이트 수신, 목록 자동 갱신
 - 방 입장: 로그인 필요 여부 확인 후 채팅방으로 이동, 비로그인 시 로그인 페이지로 리다이렉트
 - 에러 및 로딩 상태 처리: API 요청 실패 시 에러 메시지 표시, 로딩 중에는 스피너 표시   
*/

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./MainChatPage.module.css";
import CompactChatCard from "../../components/chat/CompactChatCard";
import { connectSocket } from "../../api/socket";
import { searchChatRooms } from "../../api/chatApi";
import { normalizeChatRoom } from "../../services/normalizeChatRoom";
import opaleSearchIcon from "../../assets/opaleSearchIcon.svg";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const MainChatPage = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [chatRooms, setChatRooms] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const subscriptionRef = useRef(null);

  const ICONS = {
    PUBLIC: "", //🌐
    GROUP: "👥",
    DM: "💬",
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        setError("");
        const dto = {
          roomType: "PERFORMANCE_PUBLIC",
          performanceId: null,
          keyword: searchKeyword.trim() || null,
        };
        
        const rooms = await searchChatRooms(dto);
        const normalizedRooms = rooms.map(normalizeChatRoom);
        const publicRooms = normalizedRooms.filter(
          (room) => room.roomType === "PERFORMANCE_PUBLIC"
        );
        const sortedRooms = publicRooms.sort((a, b) => {
          if (!a.lastMessageTime && !b.lastMessageTime) return 0;
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          const timeA = new Date(a.lastMessageTime).getTime();
          const timeB = new Date(b.lastMessageTime).getTime();
          return timeB - timeA;
        });
        setChatRooms(sortedRooms);
      } catch (err) {
        console.error("채팅방 목록 요청 실패:", err);
        if (err.response?.status === 401) {
          setError("로그인이 필요합니다.");
          navigate("/login");
        } else {
          setError("서버 오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, [searchKeyword, navigate]);

  useEffect(() => {
    const client = connectSocket((connectedClient) => {
      if (connectedClient && connectedClient.connected) {
        subscriptionRef.current = connectedClient.subscribe("/topic/rooms", (msg) => {
          const update = JSON.parse(msg.body);

          setChatRooms((prev) => {
            const publicRooms = prev.filter(
              (room) => room.roomType === "PERFORMANCE_PUBLIC"
            );
            
            const updatedRooms = publicRooms.map((room) =>
              room.roomId === update.roomId &&
              update.roomType === "PERFORMANCE_PUBLIC"
                ? {
                    ...room,
                    lastMessage: update.lastMessage,
                    lastMessageTime: update.lastMessageTime,
                    isActive: update.isActive ?? room.isActive,
                  }
                : room
            );
            
            const hasRoom = updatedRooms.some(
              (room) => room.roomId === update.roomId
            );
            if (
              !hasRoom &&
              update.roomType === "PERFORMANCE_PUBLIC"
            ) {
              updatedRooms.push({
                roomId: update.roomId,
                roomType: update.roomType,
                title: update.title || "",
                performanceTitle: update.performanceTitle || "",
                thumbnailUrl: update.thumbnailUrl || "",
                lastMessage: update.lastMessage,
                lastMessageTime: update.lastMessageTime,
                isActive: update.isActive ?? false,
                visitCount: update.visitCount || 0,
                participantCount: update.participantCount || 0,
              });
            }
            
            return updatedRooms.sort((a, b) => {
              if (!a.lastMessageTime && !b.lastMessageTime) return 0;
              if (!a.lastMessageTime) return 1;
              if (!b.lastMessageTime) return -1;
              const timeA = new Date(a.lastMessageTime).getTime();
              const timeB = new Date(b.lastMessageTime).getTime();
              return timeB - timeA;
            });
          });
        });
      }
    });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const sortChatRooms = (rooms) => {
    return [...rooms].sort((a, b) => {
      if (!a.lastMessageTime && !b.lastMessageTime) return 0;
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      
      const timeA = new Date(a.lastMessageTime).getTime();
      const timeB = new Date(b.lastMessageTime).getTime();
      return timeB - timeA;
    });
  };

  const filteredRooms = sortChatRooms(
    chatRooms.filter((room) => room.roomType === "PERFORMANCE_PUBLIC")
  );

  const enterRoom = (id) => {
    const token = localStorage.getItem("accessToken");
  
    const room = chatRooms.find(r => r.roomId === id);
    if (!room) return;
  
    if (!token) {
      if (room.roomType !== "PERFORMANCE_PUBLIC") {
        return navigate("/login");
      }
    }
  
    navigate(`/chat/${id}`);
  };
  
  const getRoomIcon = (roomType) => {
    switch (roomType) {
      case "PERFORMANCE_PUBLIC":
        return ICONS.PUBLIC;
      case "PERFORMANCE_GROUP":
        return ICONS.GROUP;
      case "PRIVATE_DM":
        return ICONS.DM;
      default:
        return "💠";
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchKeyword(keyword);
  };

  return (
    <div className={styles.container}>
      <form className={styles.searchBar} onSubmit={handleSearch}>
        <input
          className={styles.searchInput}
          placeholder="채팅방 또는 공연명을 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit" className={styles.searchBtn}>
          <img src={opaleSearchIcon} alt="검색" className={styles.searchIconImg} />
        </button>
      </form>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>모든 채팅방</h2>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : filteredRooms.length === 0 ? (
          <p className={styles.empty}>검색 결과가 없습니다.</p>
        ) : (
          <ul className={styles.compactList}>
            {filteredRooms.map((room) => {
              const icon = getRoomIcon(room.roomType);

              return (
                <CompactChatCard
                  key={room.roomId}
                  id={room.roomId}
                  title={`${room.title} ${icon}`}
                  performanceName={room.performanceTitle}
                  image={room.thumbnailUrl}
                  active={room.isActive}
                  visitors={room.visitCount}
                  participants={room.participantCount}
                  lastMessage={room.lastMessage}
                  lastMessageTime={room.lastMessageTime}
                  currentTime={currentTime}
                  onClick={enterRoom}
                />
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MainChatPage;
