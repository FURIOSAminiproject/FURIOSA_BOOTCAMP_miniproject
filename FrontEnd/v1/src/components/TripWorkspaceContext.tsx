import React, {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
} from "react";
import {
  createTripWorkspace,
  tripWorkspaceReducer,
  type TripAction,
  type TripWorkspace,
} from "../services/trip-workspace";

const TripContext = createContext<{
  state: TripWorkspace;
  dispatch: Dispatch<TripAction>;
} | null>(null);

/** 페이지 이동에서는 유지하고 새로고침·로그아웃 때 초기화하는 여행 입력과 실제 API 결과다. */
export function TripWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(tripWorkspaceReducer, undefined, () =>
    createTripWorkspace(),
  );
  return (
    <TripContext.Provider value={{ state, dispatch }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTripWorkspace() {
  const value = useContext(TripContext);
  if (!value) throw new Error("TripWorkspaceProvider is required");
  return value;
}
