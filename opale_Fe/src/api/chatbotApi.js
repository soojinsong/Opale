const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * 챗봇 메시지 전송 (SSE 스트리밍)
 *
 * @param {string} message - 사용자 입력 메시지
 * @param {object} callbacks
 * @param {function} callbacks.onChunk - 텍스트 청크 수신 시 (chunk: string)
 * @param {function} callbacks.onPerformances - 공연 목록 수신 시 (performances: array)
 * @param {function} callbacks.onDone - 스트리밍 완료 시
 * @param {function} callbacks.onError - 오류 발생 시 (error: Error)
 */
export const streamChatbotMessage = async (
  message,
  { onChunk, onPerformances, onDone, onError } = {},
) => {
  try {
    let token = localStorage.getItem("accessToken");
    if (token) token = token.replace(/^Bearer\s+/i, "").trim();

    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/chatbot/message`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`챗봇 요청 실패: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventName = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.substring(6).trim();
        } else if (line.startsWith("data:")) {
          const data = line.substring(5).replace(/\r$/, "");
          if (eventName === "chunk") {
            // BE가 SSE 프레이밍 유실을 막기 위해 개행을 \n으로 이스케이프해서 보냄 → 복원
            onChunk?.(data.replace(/\\n/g, "\n"));
          } else if (eventName === "performances") {
            try {
              onPerformances?.(JSON.parse(data.trim()));
            } catch {
              // JSON 파싱 실패 시 무시
            }
          } else if (eventName === "done") {
            onDone?.();
          }
          eventName = "";
        }
      }
    }
  } catch (error) {
    onError?.(error);
  }
};
