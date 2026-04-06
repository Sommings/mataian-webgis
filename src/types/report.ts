export type RespondentType = "馬太鞍居民" | "非馬太鞍居民";

export type OwnershipType = "公有" | "私有";

export type UsageType = "居住" | "農用" | "商用" | "公共服務";

export type YesNo = "是" | "否";

export type VictimRightsType = "使用權人" | "所有權人";

export type LandDamageLevel =
  | "1級：局部損害但可維持原使用"
  | "2級：半數面積無法使用"
  | "3級：幾乎完全無法使用";

export type BuildingDamageLevel =
  | "1級：局部損害但可居住"
  | "2級：部分空間無法使用"
  | "3級：主要結構或生活機能嚴重受損";

export type BuildingType =
  | "獨棟透天"
  | "連棟透天"
  | "獨棟公寓"
  | "連棟公寓"
  | "獨棟大樓"
  | "其它";

export type BuildingMaterial = "木造" | "磚造" | "鋼筋混凝土造RC";

export type Report = {
  reportDate: string;
  respondentType: RespondentType;
  address: string;
  lng: number;
  lat: number;
  landParcel: string;
  landUseType: string;
  ownership: OwnershipType;
  usage: UsageType;
  isIndigenousReserve: YesNo;

  hasLandDamage: YesNo;
  hasBuildingDamage: YesNo;

  landVictimType: VictimRightsType;
  landMudHeight: number | null;
  landDamageLevel: LandDamageLevel;

  buildingVictimType: VictimRightsType;
  buildingType: BuildingType;
  buildingTypeOther: string;
  buildingFloors: number | null;
  buildingResidents: number | null;
  buildingMaterial: BuildingMaterial;
  hasBuildingPermit: YesNo;
  hasUsePermit: YesNo;
  buildingFloodHeight: number | null;
  buildingMudHeight: number | null;
  buildingDamageLevel: BuildingDamageLevel;
  damagedAreaPing: number | null;
};

export const emptyReport: Report = {
  reportDate: "",
  respondentType: "馬太鞍居民",
  address: "",
  lng: 0,
  lat: 0,
  landParcel: "",
  landUseType: "",
  ownership: "私有",
  usage: "居住",
  isIndigenousReserve: "否",

  hasLandDamage: "是",
  hasBuildingDamage: "是",

  landVictimType: "使用權人",
  landMudHeight: null,
  landDamageLevel: "1級：局部損害但可維持原使用",

  buildingVictimType: "使用權人",
  buildingType: "獨棟透天",
  buildingTypeOther: "",
  buildingFloors: null,
  buildingResidents: null,
  buildingMaterial: "鋼筋混凝土造RC",
  hasBuildingPermit: "否",
  hasUsePermit: "否",
  buildingFloodHeight: null,
  buildingMudHeight: null,
  buildingDamageLevel: "1級：局部損害但可居住",
  damagedAreaPing: null,
};