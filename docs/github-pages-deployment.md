# GitHub Pages部署

目標儲存庫為`eevan-h/energy-saving-advisor`，網站預期網址為`https://eevan-h.github.io/energy-saving-advisor/`。儲存庫Pages的Source使用GitHub Actions。本次只建立本機設定，未提交、推送或觸發遠端部署。

## 工作流程

`.github/workflows/deploy.yml`在main收到push時自動執行，也支援Actions頁面的Run workflow（選main）。其他分支手動執行不部署。

- Ubuntu runner與Node.js 24 LTS；npm快取以package-lock.json為依據。
- 依序執行`npm ci`、`npm test`、`npm run lint`與`npm run build`；任一步失敗即不部署。
- 官方configure-pages設定後，upload-pages-artifact僅上傳dist，deploy-pages透過OIDC部署；不需要PAT或gh-pages分支。
- build僅有contents:read與pages:read；deploy僅有pages:write與id-token:write。使用github-pages environment及部署輸出的page_url。
- concurrency使用github-pages，cancel-in-progress:false，避免中斷進行中的部署。
- 官方Actions版本於設定時核對：checkout v7.0.1、setup-node v7.1.0、configure-pages v6.0.0、upload-pages-artifact v5.0.0、deploy-pages v5.0.1；後續更新應重新核對官方發行說明。

現有Node自動測試透過npm test在CI執行。另有需Playwright及本機瀏覽器的test:browser，供本機檢查，不宣稱CI已執行瀏覽器測試。

## Base與本機操作

Vite建置與preview使用`/energy-saving-advisor/`，dev使用`/`。HTML入口、CSS、JS及favicon由Vite處理base；本專案頁面使用React狀態切換，無需加入路由重寫或404.html。

PowerShell：

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

開發網址為`http://localhost:5173/`（實際連接埠以終端輸出為準）。檢查正式產物：

```powershell
npm.cmd run preview -- --host 127.0.0.1 --port 5175 --strictPort
```

預覽網址：`http://127.0.0.1:5175/energy-saving-advisor/`。瀏覽器回歸測試的預設網址已同步；自訂時ENERGY_TEST_URL須包含完整base。

## 公開產物界線

只部署dist，不能發布儲存庫根目錄。npm run build內含scripts/check-public-build.mjs，排除docs、PDF、內部審核表／來源資料、測試檔、原始碼與source map，並核對HTML的資源前綴、CSS url及JS模組引用的檔案存在。文獻、原始PDF及頁碼關聯仍在本機，未匯入前端。

正式部署是否成功須待使用者提交並push後，至GitHub Actions確認Deploy GitHub Pages執行及github-pages環境網址；本機測試通過不代表遠端部署已完成。
