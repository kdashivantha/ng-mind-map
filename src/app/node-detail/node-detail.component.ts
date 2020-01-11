import {
  Component,
  OnInit,
  NgZone,
  Renderer2,
  ElementRef,
  ViewChild,
  HostListener,
  OnDestroy
} from "@angular/core";
import { CdkDragMove, CdkDragEnd } from "@angular/cdk/drag-drop";
import { FirebaseService } from "../services/firebase.service";
import { MapNode } from '../models/mapnode';
import { Subscription } from 'rxjs';
import { MindMapService } from '../services/mindmap.service';

@Component({
  selector: "app-node-detail",
  templateUrl: "./node-detail.component.html",
  styleUrls: ["./node-detail.component.scss"]
})
export class NodeDetailComponent implements OnInit, OnDestroy {
  private editMode: boolean = false;
  private node:MapNode;
  private subscription: Subscription;
  
  @ViewChild("editmd", { static: false }) editorEl: any;

  public markdown:string = '';

  constructor(
    private ngZone: NgZone,
    private renderer: Renderer2,
    private mindMapService: MindMapService,
    private fb: FirebaseService
  ) {
    this.subscription = new Subscription();
  }

  ngOnInit() {
    this.subscription.add(
      this.mindMapService.NodeData.subscribe(data => {
        this.node = data;
        this.markdown = this.node.markdown;
      })
    );
  }

  ngOnDestroy() { 
    this.subscription.unsubscribe();
  }

  public get EditMode(): boolean {
    return this.editMode;
  }
  @HostListener('paste',['$event'])
  private handleWindowPaste = (e: ClipboardEvent) => {
    if(e.target['type'] != 'textarea') return;

    let file = e.clipboardData.items[0].getAsFile();
    if (file) {
      e.preventDefault();
      e.stopPropagation();

      let upload = this.fb.uploadFile(file);
      upload.then(url => {
        this.markdown += `\n![](${url})`;
      });
    }
  };

  public onEdit() {
    this.editMode = true;
  }
  public onSave() {
    this.editMode = false;
    //save to firebase
    this.node.markdown = this.markdown;
    this.mindMapService.updateNode(this.node);
  }
  public onCancel() {
    this.editMode = false;
    this.markdown = this.node.markdown;
  }




  

  @ViewChild("detailContent", { static: false }) DetailContainer: ElementRef;
  /**
   * drag resizer
   */
  private DetailContainerPreviousPositionX: number = 0;
  public DetailContainerFreeDragPosition = { x: 0, y: 0 };
  /**
   * ListView Container resize
   * @param  {CdkDragMove} e
   */
  public onResizeDetailContainer(e: CdkDragMove) {
    this.ngZone.runOutsideAngular(() => {
      const ListViewContainerRect = this.DetailContainer.nativeElement.getBoundingClientRect();
      let s = e.source.getFreeDragPosition();
      let diff = s.x - this.DetailContainerPreviousPositionX;

      this.renderer.setStyle(
        this.DetailContainer.nativeElement,
        "width",
        `${ListViewContainerRect.width - diff}px`
      );

      this.DetailContainerFreeDragPosition = { x: 0, y: 0 };
      this.DetailContainerPreviousPositionX = s.x;
    });
  }
  public onResizeDetailContainerDragEnded(e: CdkDragEnd) {
    this.DetailContainerPreviousPositionX = 0;
  }
}
