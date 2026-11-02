const { chromium, expect } = require(process.env.CHECK_DIR + '/node_modules/@playwright/test');
const fs = require('node:fs/promises');
(async () => {
 const url=process.env.SITE_URL;
 let ready=false,last='';
 for(let n=0;n<60;n++){
  try{const r=await fetch(url,{signal:AbortSignal.timeout(15000),cache:'no-store'});const html=await r.text();if(r.status===200&&html.includes('<title>Stewdent｜架空データの体験デモ</title>')){ready=true;break;}const state='Waiting for Pages: HTTP '+r.status;if(state!==last){console.log(state);last=state;}}
  catch{if(last!=='network'){console.log('Waiting for Pages availability');last='network';}}
  await new Promise(resolve=>setTimeout(resolve,5000));
 }
 if(!ready)throw new Error('Pages is not serving the demo yet. Enable Settings > Pages > main / (root).');
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
 try{
  await fs.mkdir('site-evidence',{recursive:true});const page=await browser.newPage({viewport:{width:1280,height:900}});const api=[];page.on('request',r=>{if(new URL(r.url()).pathname.includes('/api/'))api.push(r.url());});
  const response=await page.goto(url,{waitUntil:'networkidle'});if(response.status()!==200)throw new Error('Demo HTTP request failed');
  await expect(page.getByRole('heading',{name:/自分の言葉で学び、/})).toBeVisible();
  async function login(label){await page.evaluate(()=>location.hash='/login');await page.getByRole('button',{name:new RegExp('^'+label)}).click();await expect(page.getByRole('button',{name:'ログアウト'})).toBeVisible();}
  await login('教師');await expect(page.getByRole('heading',{name:'クラスの学習状況'})).toBeVisible();await page.screenshot({path:'site-evidence/teacher-desktop.png',fullPage:true});
  await login('生徒A');await page.locator('.row').filter({has:page.getByRole('heading',{name:'三権分立の理解チェック',exact:true})}).getByRole('link').click();await page.getByRole('button',{name:'受検画面へ'}).click();await page.getByRole('button',{name:'チェックを開始・再開'}).click();
  for(let n=0;n<3;n++){await page.getByRole('button',{name:'わからないと回答'}).click();await expect(page.getByText((n+1)+' / 3 問 提出済み',{exact:true})).toBeVisible();}
  await page.getByRole('button',{name:'提出を確定',exact:true}).click();await expect(page.getByRole('heading',{name:'提出を受け付けました'})).toBeVisible();const id=await page.evaluate(()=>location.hash.split('/').at(-1));
  await login('教師');await page.evaluate(id=>location.hash='/teacher/checks/'+id+'/review',id);
  for(let n=0;n<3;n++){const section=page.locator('section.review-item').nth(n);await section.getByLabel('教師が確認した点数').fill('0');await section.getByLabel('確認・修正理由').fill('公開デモの動作確認用。実学校データではありません。');await section.getByRole('button',{name:'教師レビューを保存'}).click();await expect(page.locator('section.review-item').nth(n).getByText('教師確認済み・未公開',{exact:true})).toBeVisible();}
  await page.getByRole('button',{name:'教師確認済みの結果を公開'}).click();await expect(page.getByRole('button',{name:'結果公開済み',exact:true})).toBeVisible();
  await login('生徒A');await page.evaluate(id=>location.hash='/app/results/'+id,id);await expect(page.getByText('教師確認済みの得点 · 正式な評定ではありません')).toBeVisible();
  await login('チューター');await page.getByRole('link',{name:'指導・記録へ'}).click();await page.getByLabel('指導した内容').fill('公開URLの動作確認（架空記録）。');await page.getByLabel('生徒の反応').fill('デモ上の入力です。');await page.getByLabel('次回の課題').fill('架空の再説明課題。');await page.getByRole('button',{name:'指導記録を保存',exact:true}).click();await expect(page.getByText('公開URLの動作確認（架空記録）。',{exact:true})).toBeVisible();
  await page.setViewportSize({width:375,height:812});await login('生徒A');await expect(page.getByRole('heading',{name:'今日の学習'})).toBeVisible();if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw new Error('Mobile overflow');await page.screenshot({path:'site-evidence/student-mobile.png',fullPage:true});if(api.length)throw new Error('Unexpected API request');
  const proof={url,status:200,flow:'teacher/student/check/review/release/tutor',mobile_width:375,api_requests:0,checked_at:new Date().toISOString()};await fs.writeFile('site-evidence/result.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exit(1);});
