import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess } from "./store/userSlice";
import { clearPreviousUserTickets, initializeUserTickets, hasUserTickets } from "./utils/ticketUtils";
import { connectSocket } from "./api/socket";

const AppInitializer = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userRaw = localStorage.getItem("user");

    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw);
        const userId = user?.userId || user?.id;

        if (userId) {
          clearPreviousUserTickets(userId);
          if (!hasUserTickets(userId)) {
            initializeUserTickets(userId);
          }
        }

        dispatch(
          loginSuccess({
            token,
            user,
          })
        );
      } catch (e) {
        console.error("❌ user 파싱 실패:", e);
      }
    }

    connectSocket();
  }, []);

  return children;
};

export default AppInitializer;
