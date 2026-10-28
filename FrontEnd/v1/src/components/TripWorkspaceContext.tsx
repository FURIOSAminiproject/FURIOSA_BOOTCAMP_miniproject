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
export const TRIP_RESULT_BACKUP_KEY = "roadfriend_last_trip_result_backup";

const TripContext = createContext<{
  state: TripWorkspace;
  dispatch: Dispatch<TripAction>;
} | null>(null);

function loadSavedTripWorkspace(): TripWorkspace {
  if (typeof window === "undefined") return createTripWorkspace();
  try {
    const saved =
      localStorage.getItem(TRIP_WORKSPACE_STORAGE_KEY) ||
      sessionStorage.getItem(TRIP_WORKSPACE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && parsed.draft) {
        const defaultWorkspace = createTripWorkspace();
        let result = parsed.result ?? null;

        // 새로고침 시 result가 유실되었을 경우 백업 캐시에서 복원 시도
        if (!result) {
          try {
            const backupSaved =
              localStorage.getItem(TRIP_RESULT_BACKUP_KEY) ||
              sessionStorage.getItem(TRIP_RESULT_BACKUP_KEY);
            if (backupSaved) {
              const backupParsed = JSON.parse(backupSaved);
              if (backupParsed?.comparison) {
                result = backupParsed;
              }
            }
          } catch {
            // ignore backup parse failure
          }
        }

        return {
          draft: { ...defaultWorkspace.draft, ...parsed.draft },
          result,
          active: parsed.active ?? "recommended",
        };
      }
    }

    // 워크스페이스 전체 캐시가 없더라도 백업된 여행 결과가 있으면 복원
    const backupSaved =
      localStorage.getItem(TRIP_RESULT_BACKUP_KEY) ||
      sessionStorage.getItem(TRIP_RESULT_BACKUP_KEY);
    if (backupSaved) {
      const parsedResult = JSON.parse(backupSaved);
      if (parsedResult?.comparison) {
        const defaultWorkspace = createTripWorkspace();
        return {
          draft: defaultWorkspace.draft,
          result: parsedResult,
          active:
            parsedResult.comparison.routes?.find((r: any) => r.route)
              ?.preference ?? "recommended",
        };
      }
    }
  } catch (e) {
    console.warn("Failed to load saved trip workspace from storage:", e);
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
      const serialized = JSON.stringify(state);
      localStorage.setItem(TRIP_WORKSPACE_STORAGE_KEY, serialized);
      sessionStorage.setItem(TRIP_WORKSPACE_STORAGE_KEY, serialized);

      if (state.result) {
        const resultSerialized = JSON.stringify(state.result);
        localStorage.setItem(TRIP_RESULT_BACKUP_KEY, resultSerialized);
        sessionStorage.setItem(TRIP_RESULT_BACKUP_KEY, resultSerialized);
      }
    } catch (e) {
      console.warn("Failed to save trip workspace to storage:", e);
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
