# 公開推薦與內部文獻資料維護

## 目前前台

推薦結果只呈現措施名稱、為什麼推薦、具體建議、改善難易度、設備投資需求及改善優先順序，另有簡短初步建議提示與必要安全提醒。不呈現文獻、SRC編號、雙頁碼、A／B／C、審核紀錄、規則分數或技術展開區塊。舊TechnicalEvidence元件已移除。

五題問答、13項措施ID／名稱、納入條件、推薦權重與排序保持原狀；只有三項冷凍冷藏建議改寫為一般用戶文字，不增加措施或效益預測。文獻核對不等於專業審核通過。

## 資料分工與隔離

- `src/data/measures.ts`：公開的措施及規則輸入，不包含source、reviewStatus等內部審核欄位。
- `src/data/measureReviews.ts`：承接原措施來源與13項pending審核狀態、reviewLabel檢查；僅供內部管理與測試，不得匯入前台。它保留原demo來源狀態，完整文獻比對另見兩份審核文件，不把新增支持視為完成專業審核。
- `src/data/technicalEvidence.ts`：既有六筆空壓依據、來源名稱、A／B及雙頁碼完整保留，現為內部資料；沒有前台匯入。
- `docs/energy-sources-register.md`、`docs/energy-measures-review.md`：保持原有來源、歷史判定、完整建議快照、頁碼、限制及審核欄位；本階段不改寫歷史內容。
- `src/components/Recommendations.tsx`：一般用戶結果與簡短安全提醒，不載入內部書目或審核資料。
- `scripts/check-public-build.mjs`：每次npm.cmd run build完成後檢查dist；內部文件、PDF、原始碼、source map或文獻／審核識別字串出現即失敗。不能只靠CSS隱藏內部內容。

## 三項冷凍冷藏公開文字與內部依據

下列為專案整理，非逐字原文，也不是新增措施或新的專業審核結論。以下欄位僅供內部追溯，不在網站顯示。

| 措施 | 採用方向 | 來源與頁碼 | 保留的界線 |
| --- | --- | --- | --- |
| refrigeration-check | 有門／蓋設備查看門封；開放櫃注意風口；散熱通風、原廠清潔與異常紀錄 | SRC-004，PDF22／印刷14、PDF43／35、PDF48／40、PDF81／73 | 原廠週期與完整紀錄程序仍待確認；結霜不直接判定故障，維修交適當能力人員 |
| refrigeration-operation | 依堆放標示保持風道，有門櫃取放後關妥，記錄溫度與補貨 | SRC-004，PDF22、24、81、85／印刷14、16、73、77 | 保存溫度依食品及原廠需求，不採歷史表數值、不以節電任意停機或調高溫度 |
| refrigeration-replacement | 先檢測可修復問題，在相同容量與保存條件比較方案，換機先安排食品暫存及達溫 | SRC-004，PDF31、90、92／印刷23、82、84 | 原判B保留；食品暫存與換機達溫為保守安全整理，完整轉存與驗收程序仍須專業確認。設備老舊不代表必換，不宣稱變頻必省 |

安全提醒以一般人可理解文字呈現：食品安全優先、不自行改除霜與安全保護、不自行拆修電氣或帶壓管路、調壓停供需專業人員確認製程需求。以上不是完整作業指導書。

## 部署

只部署 `npm.cmd run build` 產生的dist。原始PDF留在本機docs，不放入public、不從前端import或建立下載連結。不發布專案根目錄，不使用開發伺服器作公開部署。建置檢查與瀏覽器測試會驗證原始文獻及內部資料不在產物中。

## 驗證方式

1. `npm.cmd test`：原問答／推薦回歸、內部六筆來源頁碼與分類、13項待審狀態、公開措施不帶審核欄位及冷凍冷藏安全內容。
2. `npm.cmd run build`、`npm.cmd run lint`。
3. 啟動 `npm.cmd run preview -- --host 127.0.0.1 --port 5175 --strictPort` 後，另一個PowerShell執行 `npm.cmd run test:browser`。

瀏覽器測試使用Playwright及本機Chrome，不下載瀏覽器。可設定ENERGY_PLAYWRIGHT_ROOT為既有Playwright套件目錄（含package.json），或使用專案可解析的playwright；ENERGY_BROWSER_CHANNEL=msedge可選Edge。ENERGY_TEST_URL指定預覽網址，ENERGY_BROWSER_ARTIFACTS可指定截圖目錄。測試涵蓋1280／390／320px、完整問答13項結果、必要欄位與安全提醒、無隱藏內部DOM、返回改答及無來源情境。
