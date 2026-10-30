# Bouwt database.rules.json. De regels per weekend staan in tools/weekend-rules.json (zoals vroeger op de root);
# dit script hangt ze onder weekends/$w en vervangt de rolchecks door die van het weekend.
# Uitvoeren: python3 tools/build-rules.py
import json, re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
weekend = json.loads((root / 'tools/weekend-rules.json').read_text())

HEAD = "root.child('admins').child(auth.uid).val() === true"
W = "root.child('weekends').child($w)"
OWNER = f"{W}.child('owners').child(auth.uid).val() === true"
ADMIN = f"({HEAD} || {OWNER})"
STAFF = f"(auth != null && ({HEAD} || {OWNER} || {W}.child('moderators').child(auth.uid).val() === true))"
MEMBER = f"{W}.child('members').child(auth.uid).exists()"

def scope(s):
    s = s.replace("@ADMIN", f"(auth != null && {ADMIN})").replace("@STAFF", STAFF).replace("@MEMBER", f"(auth != null && {MEMBER})")
    s = s.replace(HEAD, ADMIN).replace("@HEADONLY", f"auth != null && {HEAD}")
    # alle verwijzingen naar weekenddata krijgen het weekend als prefix
    s = re.sub(r"root\.child\('(?!admins'|weekends')", f"{W}.child('", s)
    return s

def walk(node):
    if isinstance(node, dict):
        out = {}
        for k, v in node.items():
            v = walk(v)
            # De hoofdadmin mag altijd schrijven, ook als de validatie dat niet toelaat (nodig om weekends over te zetten).
            if k == '.validate' and isinstance(v, str): v = f"(auth != null && {HEAD}) || ({v})"
            out[k] = v
        return out
    if isinstance(node, str): return scope(node)
    return node

head = f"auth != null && {HEAD}"
rules = {
  "rules": {
    # De hoofdadmin mag alles lezen en schrijven (o.a. om het eerste weekend over te zetten naar weekends/…).
    ".read": head, ".write": head,
    "admins": {"$uid": {".read": "auth != null && auth.uid === $uid"}},
    # Profiel van een weekendverantwoordelijke (naam, gebruikersnaam), beheerd door de hoofdadmin.
    "staff": {".read": head, ".write": head, "$uid": {".read": "auth != null && auth.uid === $uid"}},
    # Lijst van weekends op de homepage (publiek): naam, emoji, data.
    "weekendList": {".read": True, ".write": head, "$w": {
        ".write": f"auth != null && root.child('weekends').child($w).child('owners').child(auth.uid).val() === true && newData.exists() && data.exists()",
        ".validate": "newData.hasChildren(['name']) && newData.child('name').isString() && newData.child('name').val().length <= 60"}},
    # In welk weekend zit een account? (om na het inloggen naar het juiste weekend te gaan)
    "userWeekends": {".read": head, ".write": head, "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        "$w": {".write": "auth != null && auth.uid === $uid && newData.val() === 'member' && root.child('weekends').child($w).child('members').child($uid).exists()"}}},
    # Spelcodes: welke code hoort bij welk weekend (quiz of Hitster).
    "gameCodes": {".read": True, "$code": {
        ".write": "auth != null && (" + HEAD
          + " || (newData.exists() && (root.child('weekends').child(newData.child('w').val()).child('owners').child(auth.uid).val() === true || root.child('weekends').child(newData.child('w').val()).child('moderators').child(auth.uid).val() === true))"
          + " || (!newData.exists() && (root.child('weekends').child(data.child('w').val()).child('owners').child(auth.uid).val() === true || root.child('weekends').child(data.child('w').val()).child('moderators').child(auth.uid).val() === true)))"
          + " && (!data.exists() || !newData.exists() || data.child('w').val() === newData.child('w').val())",
        ".validate": "newData.hasChildren(['w', 'kind']) && newData.child('w').isString() && (newData.child('kind').val() === 'quiz' || newData.child('kind').val() === 'hitster')"}},
    "weekends": {".read": head, ".write": head, "$w": walk(weekend)},
  }
}
(root / 'database.rules.json').write_text(json.dumps(rules, indent=2, ensure_ascii=False) + '\n')
left = [m for m in re.findall(r"root\.child\('([^']+)'\)", json.dumps(rules)) if m not in ('admins', 'weekends')]
print('regels geschreven', 'ONBEKEND:' if left else '', left)
