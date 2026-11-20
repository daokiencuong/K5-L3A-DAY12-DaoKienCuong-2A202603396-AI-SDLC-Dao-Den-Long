#!/usr/bin/env python3
"""Re-run Phase 1 smoke scenarios and verify contract-visible behavior."""
import json, pathlib, subprocess, sys, tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
PY=sys.executable
GAME=ROOT/'src'/'headless.py'
sys.path.insert(0,str(ROOT/'src'))
import headless
def run(args, expected=0):
    p=subprocess.run([PY,str(GAME),*args],cwd=ROOT,capture_output=True,text=True)
    if p.returncode!=expected: raise AssertionError(f"exit {p.returncode} != {expected}; stderr={p.stderr}")
    return p
def rows(path): return [json.loads(line) for line in pathlib.Path(path).read_text(encoding='utf8').splitlines()]
def main():
    build=subprocess.run([PY,'-m','compileall','-q','src'],cwd=ROOT,capture_output=True,text=True)
    if build.returncode: raise AssertionError(f'build syntax failed: {build.stderr}')
    contract=json.loads((ROOT/'game.contract.json').read_text(encoding='utf8'))
    if contract.get('contract_version')!='1.0' or contract.get('tuning')!=headless.T: raise AssertionError('game.contract.json does not match headless tuning')
    with tempfile.TemporaryDirectory() as td:
        a=pathlib.Path(td)/'a.jsonl';b=pathlib.Path(td)/'b.jsonl'
        common=['--seed','23','--night','1','--scenario','docs/proof/scenario-smoke.json','--inputs','docs/proof/inputs-smoke.json','--ticks','600','--snapshot-every','1']
        run([*common,'--out',str(a)]);run([*common,'--out',str(b)])
        if a.read_bytes()!=b.read_bytes(): raise AssertionError('same seed/scenario/inputs produced different output')
        result=rows(a);events=[x['name'] for x in result if x['type']=='event']
        expected=['pulse','deposit','lantern_lit','game_over']
        if events!=expected: raise AssertionError(f'events {events} != {expected}')
        if result[0]['tick']!=0 or result[-1]!={'type':'end','ticks':3,'state':'won','score':489}: raise AssertionError('unexpected initial snapshot or end record')
        # Mote pickup and shade contact use isolated deterministic scenarios.
        scenario=pathlib.Path(td)/'pickup.json';scenario.write_text(json.dumps({'random_motes':False,'random_shades':False,'motes':[[0,0,0]],'shades':[]}),encoding='utf8')
        out=pathlib.Path(td)/'pickup.jsonl';run(['--seed','7','--night','1','--scenario',str(scenario),'--ticks','1','--out',str(out)])
        if 'mote_picked' not in [x.get('name') for x in rows(out) if x['type']=='event']: raise AssertionError('mote pickup missing')
        scenario.write_text(json.dumps({'random_motes':False,'random_shades':False,'motes':[],'shades':[{'id':'Sx','pos':[.9,0,0]}]}),encoding='utf8')
        out=pathlib.Path(td)/'hit.jsonl';run(['--seed','7','--night','1','--scenario',str(scenario),'--ticks','1','--out',str(out)])
        hits=[x for x in rows(out) if x.get('name')=='player_hit']
        if not hits or hits[0]['data']['flames']!=2: raise AssertionError('shade hit did not remove one flame')
        bad=pathlib.Path(td)/'bad.json';bad.write_text('{ nope',encoding='utf8')
        run(['--seed','1','--night','1','--scenario',str(bad),'--ticks','1','--out',str(pathlib.Path(td)/'badout')],expected=2)
        report=('PASS: build syntax and contract tuning sync; scenario win with pulse/deposit/light; mote pickup; shade hit; '
                'invalid JSON exits 2; deterministic output byte-identical.\n'
                'Win trace: tick 1 pulse S1 stunned; tick 3 deposit 3 into L1, L1 lit, all_lit; '
                'end tick 3, score 489.\n')
        (ROOT/'docs'/'proof'/'verification.txt').write_text(report,encoding='utf8')
        print(report,end='')
if __name__=='__main__': main()
