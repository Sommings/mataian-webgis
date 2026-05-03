export type RespondentType = "" | "馬太鞍居民" | "非馬太鞍居民";

export type TribeName =
  | ""
  | "Fata'an（馬太鞍）"
  | "Atomo（阿陶莫）"
  | "Tafalong（太巴塱）"
  | "無";

export type OwnershipType = "" | "公有" | "私有";

export type UsageType = "" | "居住" | "農用" | "商用" | "公共服務";

export type YesNo = "" | "是" | "否";

export type VictimRightsType = "" | "使用權人" | "所有權人";

export type HeightLevel =
  | ""
  | "到腳踝"
  | "到小腿"
  | "到膝蓋"
  | "到身體"
  | "超過人";

export type LandDamageLevel =
  | ""
  | "1級：局部損害但可維持原使用"
  | "2級：半數面積無法使用"
  | "3級：幾乎完全無法使用";

export type BuildingDamageLevel =
  | ""
  | "1級：局部損害但可居住"
  | "2級：部分空間無法使用"
  | "3級：主要結構或生活機能嚴重受損";

export type BuildingType =
  | ""
  | "獨棟透天"
  | "連棟透天"
  | "獨棟公寓"
  | "連棟公寓"
  | "獨棟大樓"
  | "其它";

export type BuildingMaterial = "" | "木造" | "磚造" | "鋼筋混凝土造RC";

export type Report = {
  reportDate: string;
  respondentType: RespondentType;
  tribeName: TribeName;
  address: string;
  placeName: string;
  lng: number | null;
  lat: number | null;
  landParcel: string;
  ownership: OwnershipType;
  usage: UsageType;
  isIndigenousReserve: YesNo;

  hasLandDamage: YesNo;
  hasBuildingDamage: YesNo;

  landVictimType: VictimRightsType;
  landMudHeight: HeightLevel;
  landDamageLevel: LandDamageLevel;

  buildingVictimType: VictimRightsType;
  buildingType: BuildingType;
  buildingTypeOther: string;
  buildingFloors: number | null;
  buildingResidents: number | null;
  buildingMaterial: BuildingMaterial;
  hasBuildingPermit: YesNo;
  hasUsePermit: YesNo;
  buildingFloodHeight: HeightLevel;
  buildingMudHeight: HeightLevel;
  buildingDamageLevel: BuildingDamageLevel;
  damagedAreaPing: number | null;
};

export const emptyReport: Report = {
  reportDate: "",
  respondentType: "",
  tribeName: "",
  address: "",
  placeName: "",
  lng: null,
  lat: null,
  landParcel: "",
  ownership: "",
  usage: "",
  isIndigenousReserve: "",

  hasLandDamage: "",
  hasBuildingDamage: "",

  landVictimType: "",
  landMudHeight: "",
  landDamageLevel: "",

  buildingVictimType: "",
  buildingType: "",
  buildingTypeOther: "",
  buildingFloors: null,
  buildingResidents: null,
  buildingMaterial: "",
  hasBuildingPermit: "",
  hasUsePermit: "",
  buildingFloodHeight: "",
  buildingMudHeight: "",
  buildingDamageLevel: "",
  damagedAreaPing: null,
};