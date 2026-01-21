# DAL refactor cleanup


We did a refactor a while ago, which extracted the DAL layer of our database logic to the backend/bergenomap/repositories folder. A quick investigation indicates that these are mostly stubs, with the real DB DAL code still residing in Database.py. Do you agree with this assessment? I'd like to move the DAL code from Database.py into their respective DAL files, so the behavior actually resides where it's intended.
