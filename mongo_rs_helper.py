import sys
import json
from pymongo import MongoClient

def ping_port(port):
    try:
        client = MongoClient("localhost", int(port), serverSelectionTimeoutMS=3000)
        r = client.admin.command("ping")
        print(json.dumps(r))
        return 0
    except Exception as e:
        import traceback
        traceback.print_exc()
        return 2

def init_rs():
    cfg = {"_id": "rs", "members": [{"_id": 0, "host": "localhost:27017"}, {"_id": 1, "host": "localhost:27018"}, {"_id": 2, "host": "localhost:27019"}]}
    try:
        client = MongoClient("localhost", 27017, serverSelectionTimeoutMS=5000)
        r = client.admin.command("replSetInitiate", cfg)
        print(json.dumps(r, default=str))
        return 0
    except Exception as e:
        import traceback
        traceback.print_exc()
        return 2

def status_rs():
    try:
        client = MongoClient("localhost", 27017, serverSelectionTimeoutMS=5000)
        r = client.admin.command("replSetGetStatus")
        print(json.dumps(r, default=str))
        return 0
    except Exception as e:
        import traceback
        traceback.print_exc()
        return 2

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: ping <port> | init | status")
        sys.exit(3)
    cmd = sys.argv[1].lower()
    if cmd == "ping":
        sys.exit(ping_port(sys.argv[2]))
    elif cmd == "init":
        sys.exit(init_rs())
    elif cmd == "status":
        sys.exit(status_rs())
    else:
        print("unknown command")
        sys.exit(4)