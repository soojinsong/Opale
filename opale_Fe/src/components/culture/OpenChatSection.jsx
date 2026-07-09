import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPublicRoomByPerformance, createChatRoom } from '../../api/chatApi';
import { normalizeExistenceChatRoomResponse } from '../../services/normalizeExistenceChatRoomResponse';
import { normalizeChatRoomCreateRequest } from '../../services/normalizeChatRoomCreateRequest';
import { normalizeChatRoom } from '../../services/normalizeChatRoom';
import styles from './OpenChatSection.module.css';

const OpenChatSection = ({ performanceId, performanceTitle, performanceGenre, performancePoster }) => {
  const navigate = useNavigate();
  const [roomExists, setRoomExists] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const checkPublicRoom = async () => {
      if (!performanceId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetchPublicRoomByPerformance(performanceId);
        const normalized = normalizeExistenceChatRoomResponse(response);
        
        setRoomExists(normalized.exists);
        if (normalized.room) {
          setRoomId(normalized.room.roomId);
        }
      } catch (err) {
        console.error('❌ 오픈 채팅방 확인 실패:', err);
        setRoomExists(false);
      } finally {
        setLoading(false);
      }
    };

    checkPublicRoom();
  }, [performanceId]);

  const handleOpenChatClick = () => {
    if (roomId) {
      navigate(`/chat/${roomId}`);
    } else {
      navigate('/chat');
    }
  };

  const handleCreateChatRoom = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || token.trim() === "") {
      navigate("/login");
      return;
    }

    if (!performanceId || !performanceTitle || !performanceGenre) {
      console.error('❌ 공연 정보가 부족합니다.');
      return;
    }

    try {
      setCreating(true);
      
      const requestData = {
        title: `${performanceGenre} ${performanceTitle}`,
        description: `${performanceTitle} : 공식 오픈채팅방`,
        roomType: 'PERFORMANCE_PUBLIC',
        performanceId: performanceId,
        thumbnailUrl: performancePoster || null,
        isPublic: true,
        password: '0000',
        creatorId: -1,
      };

      const normalizedRequest = normalizeChatRoomCreateRequest(requestData);
      const response = await createChatRoom(normalizedRequest);
      const normalizedResponse = normalizeChatRoom(response);

      if (normalizedResponse.roomId) {
        setRoomExists(true);
        setRoomId(normalizedResponse.roomId);
        navigate(`/chat/${normalizedResponse.roomId}`);
      }
    } catch (err) {
      console.error('❌ 채팅방 생성 실패:', err);
      if (err.response?.status === 401) {
        navigate("/login");
      } else {
        alert('채팅방 생성에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.openChatSection}>
        <div className={styles.openChatHeader}>
          <h3 className={styles.sectionTitle}>오픈 채팅방</h3>
        </div>
        <button className={styles.openChatButton} disabled>
          확인 중...
        </button>
      </div>
    );
  }

  return (
    <div className={styles.openChatSection}>
      <div className={styles.openChatHeader}>
        <h3 className={styles.sectionTitle}>오픈 채팅방</h3>
      </div>
      {roomExists ? (
        <button 
          className={styles.openChatButton}
          onClick={handleOpenChatClick}
        >
          오픈채팅방 바로가기
        </button>
      ) : (
        <button 
          className={styles.openChatButton}
          onClick={handleCreateChatRoom}
          disabled={creating}
        >
          {creating ? '생성 중...' : '오픈채팅방 생성하기'}
        </button>
      )}
    </div>
  );
};

export default OpenChatSection;
