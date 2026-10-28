import type { SearchPlace, Preference } from "../services/route-explorer";

export interface DestinationPlace extends SearchPlace {
  contentTypeId: number;
  categoryName: string | null;
  distanceMeters: number;
}
export interface DestinationVisit {
  kind: "sightseeing" | "lunch" | "cafe" | "dinner";
  time: string;
  endTime: string;
  place: DestinationPlace;
  travelMinutes: number;
  durationMinutes: number;
}
export interface DestinationItinerary {
  arrivalDate: string;
  arrivalTime: string;
  routePreference: Preference;
  days: {
    date: string;
    dayNumber: number;
    title: string;
    visits: DestinationVisit[];
    notes: string[];
  }[];
  stayOptions: DestinationPlace[];
  warnings: string[];
  curationSource: "ai" | "local";
}
