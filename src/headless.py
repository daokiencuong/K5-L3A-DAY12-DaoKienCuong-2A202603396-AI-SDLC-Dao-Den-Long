#!/usr/bin/env python3
"""Deterministic 60 Hz simulation and JSONL adapter for Đảo Đèn Lồng."""
import argparse
import json
import math
import random
import sys

T = {
    "player_speed": 6.0, "carry_capacity": 5, "lantern_cost": 3,
    "lantern_count_night1": 5, "pickup_radius": 1.5, "interact_radius": 3.0,
    "pulse_cost": 1, "pulse_radius": 8.0, "night1_duration_s": 300,
    "flames": 3, "invuln_s": 1.5, "hit_drop_ratio": 0.5,
    "pulse_stun_s": 2.5, "pulse_push_m": 3.0, "pulse_cooldown_s": 4.0,
    "safe_radius": 4.0, "shade_speed": 2.4, "shade_hit_radius": 1.0,
    "fall_enabled": False,
    "score": {"per_mote": 10, "per_lantern": 100, "per_stun": 15,
              "per_second_left": 1, "per_flame_left": 25},
}
LANTERNS = [[0., 0., 22.], [20.9, 0., 6.8], [12.9, 0., -17.8],
            [-12.9, 0., -17.8], [-20.9, 0., 6.8]]

def d2(a, b):
    return (a[0]-b[0])**2 + (a[2]-b[2])**2

def rounded(v):
    if isinstance(v, float): return round(v + 0.0, 3)
    if isinstance(v, list): return [rounded(x) for x in v]
    if isinstance(v, dict): return {k: rounded(x) for k, x in v.items()}
    return v

class Game:
    def __init__(self, seed, scenario=None):
        self.rng = random.Random(seed)
        self.tick, self.score, self.state = 0, 0, "playing"
        self.left, self.player = float(T["night1_duration_s"]), {
            "pos": [0., 0., 0.], "carried": 0, "flames": T["flames"]}
        self.motes, self.shades = [], []
        self.lanterns = [{"id": f"L{i+1}", "pos": p[:], "lit": False, "deposited": 0}
                         for i, p in enumerate(LANTERNS)]
        self.events=[]; self.invulnerable=0; self.cooldown=0; self.jump=0
        self.prev={"interact":False,"pulse":False,"jump":False}
        self.random_motes=True; self.random_shades=True
        self.next_mote=1; self.next_shade=1
        # Fixed seeded scene setup; scenario lists replace the corresponding lists.
        for _ in range(24): self._spawn_mote()
        for _ in range(3): self._spawn_shade()
        if scenario is not None: self._scenario(scenario)

    def _spawn_mote(self, pos=None, mid=None):
        if pos is None:
            a=self.rng.random()*math.tau; r=5+math.sqrt(self.rng.random())*22
            pos=[math.cos(a)*r,0.,math.sin(a)*r]
        mid=mid or f"M{self.next_mote}"; self.next_mote+=1
        self.motes.append({"id":mid,"pos":[float(x) for x in pos]})

    def _spawn_shade(self, pos=None, sid=None):
        if pos is None:
            a=self.rng.random()*math.tau
            pos=[math.cos(a)*27,0.,math.sin(a)*27]
        sid=sid or f"S{self.next_shade}"; self.next_shade+=1
        self.shades.append({"id":sid,"pos":[float(x) for x in pos],"state":"chase","stun":0.})

    def _scenario(self, s):
        if not isinstance(s,dict): raise ValueError("scenario must be a JSON object")
        if "player" in s:
            p=s["player"]
            if not isinstance(p,dict): raise ValueError("scenario.player must be an object")
            if "pos" in p: self.player["pos"]=self._vec(p["pos"],"player.pos")
            for key,lo,hi in (("carried",0,T["carry_capacity"]),("flames",0,T["flames"])):
                if key in p:
                    n=p[key]
                    if not isinstance(n,int) or not lo<=n<=hi: raise ValueError(f"player.{key} out of range")
                    self.player[key]=n
        if "random_motes" in s: self.random_motes=self._bool(s["random_motes"],"random_motes")
        if "random_shades" in s: self.random_shades=self._bool(s["random_shades"],"random_shades")
        if s.get("random_motes") is False and "motes" not in s: self.motes=[]
        if s.get("random_shades") is False and "shades" not in s: self.shades=[]
        if "motes" in s:
            if not isinstance(s["motes"],list): raise ValueError("motes must be an array")
            self.motes=[]
            for p in s["motes"]: self._spawn_mote(self._vec(p,"mote"))
        if "shades" in s:
            if not isinstance(s["shades"],list): raise ValueError("shades must be an array")
            self.shades=[]
            for sh in s["shades"]:
                if not isinstance(sh,dict) or "pos" not in sh: raise ValueError("each shade needs pos")
                self._spawn_shade(self._vec(sh["pos"],"shade.pos"), sh.get("id"))
        if "lanterns" in s:
            if not isinstance(s["lanterns"],list): raise ValueError("lanterns must be an array")
            for upd in s["lanterns"]:
                if not isinstance(upd,dict) or upd.get("id") not in [x["id"] for x in self.lanterns]:
                    raise ValueError("lantern update needs a known id L1-L5")
                lan=next(x for x in self.lanterns if x["id"]==upd["id"])
                if "pos" in upd: lan["pos"]=self._vec(upd["pos"],"lantern.pos")
                if "deposited" in upd:
                    n=upd["deposited"]
                    if not isinstance(n,int) or n<0: raise ValueError("deposited must be nonnegative integer")
                    lan["deposited"]=min(n,T["lantern_cost"])
                if "lit" in upd: lan["lit"]=self._bool(upd["lit"],"lantern.lit")
        if "time_left_s" in s:
            v=s["time_left_s"]
            if not isinstance(v,(int,float)) or not math.isfinite(v) or v<0: raise ValueError("time_left_s must be nonnegative")
            self.left=float(v)

    @staticmethod
    def _bool(v,n):
        if not isinstance(v,bool): raise ValueError(f"{n} must be boolean")
        return v
    @staticmethod
    def _vec(v,n):
        if not isinstance(v,list) or len(v)!=3 or any(not isinstance(x,(int,float)) or not math.isfinite(x) for x in v):
            raise ValueError(f"{n} must be [x,y,z] finite numbers")
        return [float(x) for x in v]

    def emit(self,name,data): self.events.append({"type":"event","tick":self.tick,"name":name,"data":data})

    def snapshot(self):
        return rounded({"type":"snapshot","tick":self.tick,"sim_tick":self.tick,"state":self.state,
            "time_left_s":self.left,"score":self.score,
            "player":{"pos":self.player["pos"],"flames":self.player["flames"],"carried":self.player["carried"]},
            "lanterns":[{k:x[k] for k in ("id","pos","lit","deposited")} for x in self.lanterns],
            "shades":[{"id":x["id"],"pos":x["pos"],"state":x["state"]} for x in self.shades],
            "motes_active":len(self.motes),"motes":[{"id":x["id"],"pos":x["pos"]} for x in self.motes]})

    def over(self,result,reason):
        if self.state!="playing": return
        self.state=result; self.emit("game_over",{"result":result,"reason":reason})
        if result=="won":
            self.score += math.floor(self.left)*T["score"]["per_second_left"] + self.player["flames"]*T["score"]["per_flame_left"]

    def step(self, inp):
        if self.state!="playing": return
        self.tick+=1; dt=1/60; self.left=max(0.,self.left-dt)
        for x in ("invulnerable","cooldown","jump"):
            setattr(self,x,max(0.,getattr(self,x)-dt))
        move=inp.get("move",[0,0]); yaw=math.radians(inp.get("cam_yaw_deg",0))
        x,z=float(move[0]),float(move[1]); mag=math.hypot(x,z)
        if mag>1: x,z=x/mag,z/mag
        wx=x*math.cos(yaw)+z*math.sin(yaw); wz=-x*math.sin(yaw)+z*math.cos(yaw)
        p=self.player["pos"]; p[0]+=wx*T["player_speed"]*dt; p[2]+=wz*T["player_speed"]*dt
        r=math.hypot(p[0],p[2])
        if r>29.5: p[0]*=29.5/r; p[2]*=29.5/r
        for action in ("interact","pulse","jump"):
            pressed=bool(inp.get(action,False)) and not self.prev[action]
            self.prev[action]=bool(inp.get(action,False))
            if not pressed: continue
            if action=="jump": self.jump=.55
            elif action=="interact": self.interact()
            elif action=="pulse": self.pulse()
        for m in self.motes[:]:
            if d2(p,m["pos"])<=T["pickup_radius"]**2 and self.player["carried"]<T["carry_capacity"]:
                self.motes.remove(m); self.player["carried"]+=1; self.score+=T["score"]["per_mote"]
                self.emit("mote_picked",{"carried":self.player["carried"]})
        for sh in self.shades:
            if sh["stun"]>0:
                sh["stun"]=max(0.,sh["stun"]-dt); sh["state"]="stunned" if sh["stun"]>0 else "chase"; continue
            # Bóng Mực cannot enter the protective radius around a lit lantern.
            nearest=min(((d2(sh["pos"],l["pos"]),l) for l in self.lanterns if l["lit"]),default=None)
            target=p
            if nearest and nearest[0]<T["safe_radius"]**2:
                dx=sh["pos"][0]-nearest[1]["pos"][0]; dz=sh["pos"][2]-nearest[1]["pos"][2]
                if math.hypot(dx,dz)<T["safe_radius"]: target=[nearest[1]["pos"][0]+dx,0,nearest[1]["pos"][2]+dz]
            dx,dz=target[0]-sh["pos"][0],target[2]-sh["pos"][2]; dist=math.hypot(dx,dz)
            if dist>1e-9:
                sh["pos"][0]+=dx/dist*T["shade_speed"]*dt; sh["pos"][2]+=dz/dist*T["shade_speed"]*dt
            if self.invulnerable<=0 and d2(p,sh["pos"])<=T["shade_hit_radius"]**2:
                self.hit("shade"); break
        if self.random_motes and self.tick%900==0 and len(self.motes)<24: self._spawn_mote()
        if self.random_shades and self.tick%1800==0 and len(self.shades)<5:
            self._spawn_shade(); self.emit("shade_spawned",{"id":self.shades[-1]["id"]})
        if self.player["flames"]<=0: self.over("lost","no_flames")
        elif all(l["lit"] for l in self.lanterns): self.over("won","all_lit")
        elif self.left<=0: self.over("lost","dawn")

    def interact(self):
        p=self.player["pos"]
        near=[l for l in self.lanterns if not l["lit"] and d2(p,l["pos"])<=T["interact_radius"]**2]
        if not near or self.player["carried"]<=0: return
        l=min(near,key=lambda x:d2(p,x["pos"])); amount=min(self.player["carried"],T["lantern_cost"]-l["deposited"])
        if amount<=0:return
        l["deposited"]+=amount; self.player["carried"]-=amount
        self.emit("deposit",{"lantern_id":l["id"],"amount":amount,"deposited":l["deposited"]})
        if l["deposited"]>=T["lantern_cost"]:
            l["lit"]=True; self.score+=T["score"]["per_lantern"]; self.emit("lantern_lit",{"lantern_id":l["id"]})

    def pulse(self):
        if self.cooldown>0 or self.player["carried"]<T["pulse_cost"]: return
        self.player["carried"]-=T["pulse_cost"]; self.cooldown=T["pulse_cooldown_s"]
        p=self.player["pos"]; hit=[]
        for sh in self.shades:
            if d2(p,sh["pos"])<=T["pulse_radius"]**2:
                sh["stun"]=T["pulse_stun_s"]; sh["state"]="stunned"; dx,dz=sh["pos"][0]-p[0],sh["pos"][2]-p[2]
                n=math.hypot(dx,dz) or 1; sh["pos"][0]+=dx/n*T["pulse_push_m"]; sh["pos"][2]+=dz/n*T["pulse_push_m"]
                hit.append(sh["id"]); self.score+=T["score"]["per_stun"]
        self.emit("pulse",{"stunned_ids":hit})

    def hit(self,by):
        self.player["flames"]-=1; dropped=min(self.player["carried"],math.floor(self.player["carried"]*T["hit_drop_ratio"]))
        self.player["carried"]-=dropped
        if dropped:
            for _ in range(dropped): self._spawn_mote(self.player["pos"][:])
        self.invulnerable=T["invuln_s"]; self.emit("player_hit",{"by":by,"flames":self.player["flames"],"dropped":dropped})

def read_json(path,label):
    try:
        with open(path,encoding="utf-8") as f: return json.load(f)
    except (OSError,json.JSONDecodeError) as e: raise ValueError(f"invalid {label}: {e}") from e

def main():
    ap=argparse.ArgumentParser(description="Đảo Đèn Lồng deterministic headless simulation")
    ap.add_argument("--seed",type=int,required=True); ap.add_argument("--night",type=int,required=True,choices=[1])
    ap.add_argument("--scenario"); ap.add_argument("--inputs"); ap.add_argument("--ticks",type=int,required=True)
    ap.add_argument("--out",required=True); ap.add_argument("--snapshot-every",type=int,default=10)
    a=ap.parse_args()
    if a.ticks<0 or a.snapshot_every<1: ap.error("--ticks must be nonnegative and --snapshot-every positive")
    try:
        scenario=read_json(a.scenario,"scenario") if a.scenario else None
        inpfile=read_json(a.inputs,"inputs") if a.inputs else {"frames":[]}
        if not isinstance(inpfile,dict) or not isinstance(inpfile.get("frames",[]),list): raise ValueError("inputs must be an object with frames array")
        frames=inpfile.get("frames",[]); prior=-1
        for f in frames:
            if not isinstance(f,dict) or not isinstance(f.get("tick"),int) or f["tick"]<=prior: raise ValueError("frame ticks must be strictly increasing nonnegative integers")
            if f["tick"]<0: raise ValueError("frame tick must be nonnegative")
            if "move" in f and (not isinstance(f["move"],list) or len(f["move"])!=2 or any(not isinstance(v,(int,float)) or not -1<=v<=1 for v in f["move"])): raise ValueError("move must be [x,z] with components in [-1,1]")
            if "cam_yaw_deg" in f and (not isinstance(f["cam_yaw_deg"],(int,float)) or not math.isfinite(f["cam_yaw_deg"])): raise ValueError("cam_yaw_deg must be finite")
            for k in ("jump","interact","pulse"):
                if k in f and not isinstance(f[k],bool): raise ValueError(f"{k} must be boolean")
            prior=f["tick"]
        game=Game(a.seed,scenario); active={"move":[0.,0.],"cam_yaw_deg":0.,"jump":False,"interact":False,"pulse":False}; fi=0
        output=[game.snapshot()]
        for k in range(a.ticks):
            while fi<len(frames) and frames[fi]["tick"]==k:
                active.update({key:value for key,value in frames[fi].items() if key!="tick"}); fi+=1
            game.step(active); output.extend(game.events); game.events=[]
            if game.tick%a.snapshot_every==0: output.append(game.snapshot())
            if game.state!="playing": break
        output.append({"type":"end","ticks":game.tick,"state":game.state,"score":game.score})
        with open(a.out,"w",encoding="utf-8",newline="\n") as f:
            for row in output: f.write(json.dumps(row,ensure_ascii=False,separators=(",",":"))+"\n")
    except (ValueError,TypeError,KeyError) as e:
        print(str(e),file=sys.stderr); return 2
    return 0

if __name__=="__main__": raise SystemExit(main())
