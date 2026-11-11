export function chartlePage({ pageHead }) {
  return `<div class="wrap ct" id="chartle">
  <header class="ct-head"><span class="kicker">Daily game</span><h1>Chartle</h1><p class="dek sm">One mystery chart a day from the site's data library. Guess the series in six tries. Each wrong guess unlocks a clue. A new chart appears at midnight, India time.</p></header>
  <div class="ct-board"><div id="ct-chart" class="ec" style="height:380px"></div>
   <div class="ct-clues" id="ct-clues"></div>
   <div class="ct-guess"><label class="sr" for="ct-in">Your guess</label><input id="ct-in" list="ct-list" placeholder="Type to search 300 series…" autocomplete="off"><datalist id="ct-list"></datalist><button class="btn" id="ct-go" type="button">Guess</button></div>
   <ol class="ct-tries" id="ct-tries"></ol>
   <div class="ct-end" id="ct-end" hidden></div></div>
  <p class="meta">Puzzle number counts from 12 November 2026. Your progress is kept on this device only.</p></div>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js" defer></script>
  <script src="/chartle.js?v=${Date.now()}" defer></script>`;
}
