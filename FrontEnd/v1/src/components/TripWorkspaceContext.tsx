import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type Dispatch,
} from "react";
import {
  createTripWorkspace,
  tripWorkspaceReducer,
  type TripAction,
  type TripWorkspace,
} from "../services/trip-workspace";

const TRIP_WORKSPACE_STORAGE_KEY = "roadfriend_trip_workspace_v1";

const TripContext = createContext<{
  state: TripWorkspace;
  dispatch: Dispatch<TripAction>;
} | null>(null);

function loadSavedTripWorkspace(): TripWorkspace {
  if (typeof window === "undefined") return createTripWorkspace();
  try {
    const saved = localStorage.getItem(TRIP_WORKSPACE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && parsed.draft) {
        const defaultWorkspace = createTripWorkspace();
        return {
          draft: { ...defaultWorkspace.draft, ...parsed.draft },
          result: parsed.result ?? null,
          active: parsed.active ?? "recommended",
        };
      }
    }
  } catch (e) {
    console.warn("Failed to load saved trip workspace from localStorage:", e);
  }
  return createTripWorkspace();
}

/** 페이지 이동 및 새로고침(F5) 시에도 유지되는 여행 입력과 실제 API 결과다. */
export function TripWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(
    tripWorkspaceReducer,
    undefined,
    loadSavedTripWorkspace,
  );

  useEffect(() => {
    try {
      localStorage.setItem(TRIP_WORKSPACE_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Failed to save trip workspace to localStorage:", e);
    }
  }, [state]);

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
