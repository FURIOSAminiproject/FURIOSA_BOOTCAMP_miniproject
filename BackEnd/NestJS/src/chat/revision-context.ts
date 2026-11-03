import type { DestinationItinerary } from '../route-explorer/destination-itinerary';
import type { SpotPlace } from '../route-explorer/explorer.types';
import { allowedVisitKinds } from './itinerary-revision';
import { placeImageUrl } from '../route-explorer/place-image';

export function revisionPlaceContext(places: SpotPlace[]) {
  return places.map((place) => ({
    id: place.id,
    name: place.name,
    category: place.categoryName,
    contentTypeId: place.contentTypeId,
    allowedKinds: allowedVisitKinds(place.contentTypeId),
    distanceMeters: place.distanceMeters,
  }));
}

/** 날짜별 이름·실제 방문 종류·개수를 함께 제공해 ID 연결이나 마지막 날 추측을 줄인다. */
export function revisionItineraryContext(itinerary: DestinationItinerary) {
  return {
    arrivalDate: itinerary.arrivalDate,
    arrivalTime: itinerary.arrivalTime,
    dayCount: itinerary.days.length,
    lastDayNumber: itinerary.days.at(-1)!.dayNumber,
    days: itinerary.days.map((day) => ({
      dayNumber: day.dayNumber,
      date: day.date,
      title: day.title,
      isLastDay: day.dayNumber === itinerary.days.at(-1)!.dayNumber,
      visitCounts: {
        sightseeing: day.visits.filter((v) => v.kind === 'sightseeing').length,
        lunch: day.visits.filter((v) => v.kind === 'lunch').length,
        cafe: day.visits.filter((v) => v.kind === 'cafe').length,
        dinner: day.visits.filter((v) => v.kind === 'dinner').length,
      },
      visits: day.visits.map((v) => ({
        placeId: v.place.id,
        placeName: v.place.name,
        contentTypeId: v.place.contentTypeId,
        kind: v.kind,
        time: v.time,
        endTime: v.endTime,
        durationMinutes: v.durationMinutes,
      })),
    })),
  };
}

/** 화면 스냅샷에서 계약 필드만 복사한다. 다른 요청/DB 여행 ID를 조회하지 않는다. */
export function copyRevisionItinerary(
  input: DestinationItinerary,
): DestinationItinerary {
  const copyPlace = (place: SpotPlace): SpotPlace => ({
    id: place.id,
    name: place.name,
    address: place.address,
    ...(place.imageUrl ? { imageUrl: placeImageUrl(place.imageUrl) } : {}),
    latitude: place.latitude,
    longitude: place.longitude,
    contentTypeId: place.contentTypeId,
    categoryName: place.categoryName,
    distanceMeters: place.distanceMeters,
  });
  return {
    arrivalDate: input.arrivalDate,
    arrivalTime: input.arrivalTime,
    routePreference: input.routePreference,
    curationSource: input.curationSource,
    warnings: [...input.warnings],
    stayOptions: input.stayOptions.map(copyPlace),
    days: input.days.map((day) => ({
      date: day.date,
      dayNumber: day.dayNumber,
      title: day.title,
      notes: [...day.notes],
      visits: day.visits.map((v) => ({
        kind: v.kind,
        time: v.time,
        endTime: v.endTime,
        durationMinutes: v.durationMinutes,
        travelMinutes: v.travelMinutes,
        place: copyPlace(v.place),
      })),
    })),
  };
}
