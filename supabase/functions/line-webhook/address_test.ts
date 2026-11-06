import { deepStrictEqual, equal, ok } from "node:assert/strict";
import { type AddressPoint, geocode } from "./address.ts";

const db: AddressPoint[] = [
  { a: "花蓮縣光復鄉大全村中山路一段５０號", x: 121.41569, y: 23.64519 },
  { a: "花蓮縣光復鄉大全村中山路一段５２號", x: 121.41557, y: 23.64544 },
  { a: "花蓮縣光復鄉大進村中山路一段１２５號", x: 121.41901, y: 23.65687 },
  { a: "花蓮縣鳳林鎮北林里大忠路１９５號", x: 121.48833, y: 23.76362 },
];

Deno.test("完整門牌：半形數字也能對到全形門牌", () => {
  const hit = geocode(db, "光復鄉大全村中山路一段50號");
  deepStrictEqual(hit, { lat: 23.64519, lng: 121.41569, matched: "花蓮縣光復鄉大全村中山路一段５０號", precision: "address" });
});

Deno.test("口語開頭會被去掉再比對", () => {
  equal(geocode(db, "我家住在中山路一段125號")?.matched, "花蓮縣光復鄉大進村中山路一段１２５號");
});

Deno.test("門牌不存在時不會配到別條路的同號", () => {
  equal(geocode(db, "仁愛路一段50號"), null);
});

Deno.test("只說村名：取該村門牌的平均位置", () => {
  const hit = geocode(db, "我家在大全村那邊");
  ok(hit);
  equal(hit.precision, "village");
  equal(hit.matched, "光復鄉大全村");
  ok(Math.abs(hit.lat - (23.64519 + 23.64544) / 2) < 1e-9);
});

Deno.test("找不到就回傳 null", () => {
  equal(geocode(db, "台北市信義路"), null);
  equal(geocode(db, "   "), null);
});

Deno.test("真實門牌資料庫：光復鄉大全村", async () => {
  const real = JSON.parse(await Deno.readTextFile(new URL("../../../public/address_db.json", import.meta.url))) as AddressPoint[];
  equal(geocode(real, "花蓮縣光復鄉大全村中山路一段５２號")?.precision, "address");
  equal(geocode(real, "大進村")?.matched, "光復鄉大進村");
});
