package yegam.opale_be.domain.place.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import yegam.opale_be.domain.place.dto.request.*;
import yegam.opale_be.domain.place.dto.response.detail.*;
import yegam.opale_be.domain.place.dto.response.list.*;
import yegam.opale_be.domain.place.entity.Place;
import yegam.opale_be.domain.place.entity.PlaceStage;
import yegam.opale_be.domain.place.exception.PlaceErrorCode;
import yegam.opale_be.domain.place.mapper.PlaceMapper;
import yegam.opale_be.domain.place.repository.PlaceRepository;
import yegam.opale_be.domain.review.common.ReviewType;
import yegam.opale_be.domain.review.place.repository.PlaceReviewRepository;
import yegam.opale_be.global.common.BasePlaceListResponseDto;
import yegam.opale_be.global.exception.CustomException;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlaceService {

  private final PlaceRepository placeRepository;
  private final PlaceMapper placeMapper;
  private final PlaceReviewRepository placeReviewRepository;

  public PlaceListResponseDto getPlaceList(PlaceListRequestDto dto) {

    String keyword = emptyToNull(dto.getKeyword());
    String areaFilter = emptyToNull(dto.getArea());

    int page = (dto.getPage() != null && dto.getPage() > 0) ? dto.getPage() - 1 : 0;
    int size = (dto.getSize() != null && dto.getSize() > 0) ? dto.getSize() : 20;

    PageRequest pageable = PageRequest.of(page, size);

    List<String> areaList = resolveAreaFilter(areaFilter);
    List<String> areasParam = areaList.isEmpty() ? null : areaList;

    Page<Place> pageResult =
        placeRepository.search(keyword, areasParam, pageable);

    return placeMapper.toPagedPlaceListDtoWithStats(pageResult, placeReviewRepository);
  }

  public PlaceNearbyListResponseDto getNearbyPlaces(PlaceNearbyRequestDto dto) {
    if (dto.getLatitude() == null || dto.getLongitude() == null) {
      throw new CustomException(PlaceErrorCode.INVALID_COORDINATE);
    }

    double lat = dto.getLatitude().doubleValue();
    double lon = dto.getLongitude().doubleValue();
    int radius = dto.getRadius() != null ? dto.getRadius() : 3000;

    String sortType =
        (dto.getSortType() != null && !dto.getSortType().isBlank())
            ? dto.getSortType()
            : "거리순";

    List<Object[]> result =
        placeRepository.findNearbyPlacesWithDistance(lat, lon, radius);

    PlaceNearbyListResponseDto response =
        placeMapper.toNearbyListDto(
            result,
            dto.getLatitude(),
            dto.getLongitude(),
            radius,
            sortType
        );

    response.getPlaces().forEach(p -> {
      Long count = placeReviewRepository.countByPlaceIdAndType(p.getPlaceId(), ReviewType.PLACE);
      Double avg = placeReviewRepository.avgRatingByPlaceIdAndType(p.getPlaceId(), ReviewType.PLACE);

      p.setReviewCount(count != null ? count : 0L);
      p.setRating(avg != null ? avg : 0.0);
    });

    if ("이름순".equals(sortType)) {
      response.getPlaces().sort((a, b) -> a.getName().compareToIgnoreCase(b.getName()));
    } else {
      response.getPlaces().sort((a, b) -> Double.compare(a.getDistance(), b.getDistance()));
    }

    return response;
  }

  public PlaceBasicResponseDto getPlaceBasic(String placeId) {
    Place place = findPlace(placeId);
    return placeMapper.toPlaceBasicDtoWithStats(place, placeReviewRepository);
  }

  public BasePlaceListResponseDto<PlaceStageResponseDto> getPlaceStages(String placeId) {
    Place place = findPlace(placeId);

    List<PlaceStageResponseDto> stages =
        place.getPlaceStages().stream()
            .map(placeMapper::toPlaceStageDto)
            .collect(Collectors.toList());

    return placeMapper.toBasePlaceListResponse(place, stages);
  }

  public PlaceFacilityResponseDto getPlaceFacilities(String placeId) {
    Place place = findPlace(placeId);
    return placeMapper.toPlaceFacilityDto(place);
  }

  public BasePlaceListResponseDto<PlacePerformanceResponseDto> getPlacePerformances(String placeId) {
    Place place = findPlace(placeId);

    List<PlacePerformanceResponseDto> performances =
        place.getPerformances().stream()
            .map(placeMapper::toPlacePerformanceDto)
            .collect(Collectors.toList());

    return placeMapper.toBasePlaceListResponse(place, performances);
  }

  // -----------------------------------------------------------
  // util
  // -----------------------------------------------------------
  private Place findPlace(String id) {
    return placeRepository.findById(id)
        .orElseThrow(() -> new CustomException(PlaceErrorCode.PLACE_NOT_FOUND));
  }

  private String emptyToNull(String s) {
    return (s == null || s.isBlank()) ? null : s;
  }

  private List<String> resolveAreaFilter(String areaFilter) {
    if (areaFilter == null || areaFilter.isBlank() || "전체".equals(areaFilter)) {
      return List.of();
    }

    switch (areaFilter) {
      case "서울":
        return List.of("서울특별시");

      case "경기":
        return List.of("경기도", "인천광역시");

      case "충청":
        return List.of(
            "충청북도",
            "충청남도",
            "세종특별자치시",
            "대전광역시"
        );

      case "강원":
        return List.of("강원도", "강원특별자치도");

      case "경상":
        return List.of(
            "경상북도",
            "경상남도",
            "부산광역시",
            "대구광역시",
            "울산광역시"
        );

      case "전라":
        return List.of(
            "전라북도",
            "전북특별자치도",
            "전라남도",
            "광주광역시"
        );

      case "제주":
        return List.of("제주특별자치도");

      default:
        return List.of(areaFilter);
    }
  }
}
