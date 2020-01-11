import { Observable } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import { BackupService } from '../services/backup.service';
import { FormControl } from '@angular/forms';
import { startWith, map } from 'rxjs/operators';
import { MindMapService } from '../services/mindmap.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  constructor(
    private mindMapService: MindMapService,
    private backupService: BackupService) { }

  myControl = new FormControl();
  mindMaps: string[] = ['One', 'Two', 'Three'];
  filteredMindMaps: Observable<string[]>;

  ngOnInit() {
    this.filteredMindMaps = this.myControl.valueChanges
      .pipe(
        startWith(''),
        map(value => this._filter(value))
      );
  }
  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.mindMaps.filter(option => option.toLowerCase().includes(filterValue));
  }


  onBackupData(){
    this.DownloadDataFile();
  }

  onFileUpload(event:Event){
    this.LoadDataFile(event.target);
  }

  onAddNewMap() {
    this.mindMapService.createMindMap(null);
  }
  private DownloadDataFile(){
    var sub = this.backupService.ReadFromLocalStorage().subscribe(
        (textToSave)=>{
          debugger;
            var textToSaveAsBlob = new Blob([JSON.stringify(textToSave,undefined,2)], {type:"application/json"});
            var textToSaveAsURL = window.URL.createObjectURL(textToSaveAsBlob);
            var fileNameToSaveAs = `mindmap-${new Date().getTime()}.json`;
            var downloadLink = document.createElement("a");
            downloadLink.download = fileNameToSaveAs;
            downloadLink.innerHTML = "Download File";
            downloadLink.href = textToSaveAsURL;
            downloadLink.style.display = "none";
            document.body.appendChild(downloadLink);
    
            downloadLink.click();
        }).add(()=>{
            sub.unsubscribe();
        });
    
  }

  private LoadDataFile(inputValue:any){
      var file:File = inputValue.files[0];
      var myReader:FileReader = new FileReader();
      myReader.onloadend = (e) => {
        debugger;
          this.backupService.WriteToLocalStorage(JSON.parse(<string>myReader.result));
      }
      myReader.readAsText(file);
  }

}
