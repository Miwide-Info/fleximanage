from pathlib import Path
p=Path(r"C:\fleximanage\install_services_win.bat")
s=p.read_text(encoding='utf-8')
open_total=s.count('(')
close_total=s.count(')')
print(f"TOTAL open={open_total} close={close_total}")
lines=s.splitlines()
balance=0
for i,line in enumerate(lines, start=1):
    o=line.count('(')
    c=line.count(')')
    balance += o-c
    if o>0 or c>0 or balance<0:
        print(f"{i:04d}: bal={balance:>4} (+{o}/-{c}) {line}")

# report any final non-zero balance
if balance!=0:
    print(f"FINAL BALANCE non-zero: {balance}")
else:
    print("FINAL BALANCE zero")
