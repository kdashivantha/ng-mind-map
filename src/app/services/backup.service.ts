import { Injectable } from '@angular/core';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private _dbKey:string = "db";

  constructor(private localStorage: LocalStorage) {
      
  }

  /**
   * write data to Localstorage
   * @param data 
   */
  public WriteToLocalStorage(data:any){
      this.localStorage.setItem(this._dbKey, JSON.stringify(data)).subscribe(() => {});
  }

  /**
   * read data from local storage
   * @param key 
   */
  public ReadFromLocalStorage():Observable<any>{
      return this.localStorage.getItem(this._dbKey).pipe(
          map((data:string)=> JSON.parse(data))
      );
  }
}
