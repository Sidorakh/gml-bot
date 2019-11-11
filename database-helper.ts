import * as sqlite3 from 'sqlite3';

export class DatabaseHelper {
    private db: sqlite3.Database;
    constructor (db: sqlite3.Database) {
        this.db = db;
    }
    public all(sql: string) : Promise<Array<any>> {
        return new Promise((resolve,reject)=>{
            this.db.all(sql,(err,row)=>{
                try {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                } catch(e) {
                    reject(e);
                }
            });
        }); 
    }
    public get(sql: string) : Promise<any> {
        return new Promise((resolve,reject)=>{
            try {
            this.db.get(sql,(err,row)=>{
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
            } catch(e) {
                reject(e);
            }
        }); 
    }
    public run(sql: string) : Promise<void>{
        return new Promise((resolve,reject)=>{
            try {
                this.db.run(sql,(err)=>{
                    if (err) reject(err);
                    resolve();
                })
            } catch(e) {
                throw e;
            }
        });
    }
    public stmt_all(stmt:sqlite3.Statement,...params:Array<any>) : Promise<Array<any>> {
        return new Promise((resolve,reject)=>{
            try {
                stmt.all(...params,(err,row)=>{
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            } catch(e) {
                reject(e);
            }
        });
    }

    public stmt_get(stmt: sqlite3.Statement, ...params:Array<any>) : Promise<any> {
        return new Promise((resolve,reject)=>{
            try {
                stmt.get(...params,(err,row)=>{
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            } catch(e) {
                reject(e);
            }
        });
    }

    public stmt_run(stmt: sqlite3.Statement, ...params:Array<any>) : Promise<void> {
        return new Promise((resolve,reject)=>{
            try {
                stmt.run(...params,(err)=>{
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } catch(e) {
                reject(e);
            }
        });
    }
    public get_db() : sqlite3.Database {
        return this.db;
    }

}