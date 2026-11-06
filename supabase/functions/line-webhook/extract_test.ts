import { deepStrictEqual, equal } from "node:assert/strict";
import { parseExtraction } from "./extract.ts";

Deno.test("合格的 JSON 會被接受並去掉空白", () => {
  deepStrictEqual(
    parseExtraction('{"damage_type":"房子","height_level":"到膝蓋","place_description":" 大全村 ","summary":"一樓淹到膝蓋，冰箱壞了。"}'),
    { damage_type: "房子", height_level: "到膝蓋", place_description: "大全村", summary: "一樓淹到膝蓋，冰箱壞了。" },
  );
});

Deno.test("選項不在清單內、缺欄位、不是 JSON 都回傳 null", () => {
  equal(parseExtraction('{"damage_type":"倉庫","height_level":"到膝蓋","place_description":"","summary":""}'), null);
  equal(parseExtraction('{"damage_type":"房子","height_level":"到膝蓋","summary":""}'), null);
  equal(parseExtraction("不是 JSON"), null);
});
