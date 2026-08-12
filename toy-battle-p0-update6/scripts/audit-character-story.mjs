import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dialogueFile = path.join(projectRoot, 'assets', 'dialog', 'escape-dialogue.txt');
const reportFile = path.join(projectRoot, 'STORY-AUDIT.txt');

const sectionNumbers = {'①':1,'②':2,'③':3,'④':4,'⑤':5,'⑥':6,'⑦':7,'⑧':8,'⑨':9,'⑩':10,'⑪':11,'⑫':12,'⑬':13,'⑭':14,'⑮':15};
const characters = {
  기어:{id:'windup_soldier',label:'태엽 병정'},
  미유:{id:'plush_cat',label:'봉제 고양이'},
  우디:{id:'wooden_puppet',label:'나무 인형'},
  덕키:{id:'rubber_duck',label:'고무 오리'},
  페이퍼:{id:'paper_robot',label:'종이 로봇'},
  피코:{id:'clown_doll',label:'광대 인형'},
  랜슬롯:{id:'toy_knight',label:'장난감 기사'}
};
const expressions = {
  '기본 표정':'normal','기본':'normal','웃는 얼굴':'smile','웃는 표정':'smile',
  '놀란 표정':'surprised','당황 표정':'flustered','진지한 표정':'serious','진지한 얼굴':'serious',
  '화난 표정':'angry','겁먹은 표정':'scared'
};

const raw = fs.readFileSync(dialogueFile, 'utf8').replace(/\r/g, '');
const lines = [];
const errors = [];
const counts = Object.fromEntries(Object.keys(characters).map(name => [name, 0]));
counts['전원'] = 0;
let section = 0;

raw.split('\n').forEach((rawLine, sourceIndex) => {
  const text = rawLine.trim();
  const header = text.match(/^([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])/);
  if (header) { section = sectionNumbers[header[1]]; return; }
  const match = text.match(/^([^:：]+)[:：]\s*[“"](.+?)[”"](?:\s*\((.+?)\))?\s*$/);
  if (!match) return;
  const name = match[1].trim();
  const spoken = match[2].trim();
  const expression = (match[3] || '기본 표정').trim();
  const group = name === '전원';
  const character = characters[name];
  const expressionDir = expressions[expression];
  if (!group && !character) errors.push(`원문 ${sourceIndex+1}줄: 알 수 없는 캐릭터 이름 '${name}'`);
  if (!expressionDir) errors.push(`원문 ${sourceIndex+1}줄: 알 수 없는 표정 '${expression}'`);
  let portrait = '(얼굴 없음 — 전원 대사)';
  let exists = true;
  if (!group && character && expressionDir) {
    const extension = expressionDir === 'smile' ? 'webp' : 'png';
    portrait = `assets/dialog/expressions/${expressionDir}/${character.id}.${extension}`;
    exists = fs.existsSync(path.join(projectRoot, ...portrait.split('/')));
    if (!exists) errors.push(`원문 ${sourceIndex+1}줄: 얼굴 파일 없음 '${portrait}'`);
  }
  if (counts[name] == null) counts[name] = 0;
  counts[name]++;
  lines.push({section, sourceLine:sourceIndex+1, name, spoken, expression, character, portrait, exists, group});
});

const report = [];
report.push('TOY BOTTLE 탈출 스토리 — 캐릭터 이름·얼굴 전수 검사');
report.push(`검사 일시: ${new Date().toISOString()}`);
report.push(`원문: assets/dialog/escape-dialogue.txt`);
report.push('');
report.push('[고정 이름 매핑]');
for (const [name, character] of Object.entries(characters)) report.push(`- ${name} -> ${character.label} -> ${character.id}`);
report.push('- 전원 -> 캐릭터 얼굴을 표시하지 않는 단체 대사');
report.push('');
report.push('[대사 수]');
for (const [name, count] of Object.entries(counts)) report.push(`- ${name}: ${count}줄`);
report.push(`- 합계: ${lines.length}줄`);
report.push('');
report.push(`[검사 결과] ${errors.length === 0 ? 'PASS — 이름/표정/얼굴 파일 오류 0개' : `FAIL — ${errors.length}개 오류`}`);
for (const error of errors) report.push(`- ${error}`);
report.push('');
report.push('[처음부터 끝까지 줄별 검사]');
for (const [index, line] of lines.entries()) {
  const id = line.group ? '(없음)' : line.character?.id || '(오류)';
  report.push(`${String(index+1).padStart(3,'0')}. 구간 ${String(line.section).padStart(2,'0')} / 원문 ${String(line.sourceLine).padStart(3,'0')}줄 / 이름=${line.name} / ID=${id} / 표정=${line.expression} / 얼굴=${line.portrait} / ${line.exists ? 'PASS' : 'FAIL'}`);
  report.push(`     “${line.spoken}”`);
}

fs.writeFileSync(reportFile, `${report.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({pass:errors.length===0,total:lines.length,counts,errors,reportFile}, null, 2));
process.exitCode = errors.length ? 1 : 0;
