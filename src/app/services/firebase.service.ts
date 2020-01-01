import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { Node } from "../models/node";
import { Map } from "../models/map";
import { NodeData } from "../models/node-data";
import { Connection } from "../models/connection";
import { map, flatMap } from "rxjs/operators";
import { combineLatest, Observable, Subject, of } from "rxjs";
import { AngularFireStorage } from '@angular/fire/storage';

@Injectable({
  providedIn: "root"
})
export class FirebaseService {
  mapId: string = "xvNiEeIr1VGoTICYc2fn";
  autoSave: number = 30;

  public MapData: Subject<any> = new Subject<any>();
  public NodeData: Subject<any> = new Subject<any>();

  constructor(
    private angularFirestore: AngularFirestore,
    private angularFireStorage: AngularFireStorage
    ) {}


  
  /** firebase utils */
  convertSnapshots<T>(snaps) {
    if(!Array.isArray(snaps)){
      snaps = [snaps];
    }
    return <T[]>snaps.map(snap => {
      return (snap.payload.doc) ? {
        id: snap.payload.doc.id,
        ...snap.payload.doc.data()
      }:
      {
        id: snap.payload.id,
        ...snap.payload.data()
      };
    });
  }

  getDocumentsWithSubcollection<T extends IFirestoreDoc>(
    collection: string,
    id: string,
    subCollection: string
  ) {
    return this.angularFirestore
      .collection(collection)
      .doc(this.mapId)
      .snapshotChanges()
      .pipe(
        map(this.convertSnapshots),
        map((documents: T[]) =>
          documents.map(document => {
            return this.angularFirestore
                .collection(`${collection}/${document.id}/${subCollection}`)
                .snapshotChanges()
                .pipe(
                  map(this.convertSnapshots),
                  map(subdocuments =>
                    Object.assign(document, { [subCollection]: subdocuments })
                  )
                );
          })
        ),
        flatMap(combined => combineLatest(...combined))
      );
  }

  loadMindMap() {
    this.getDocumentsWithSubcollection<Map>("maps",this.mapId,"items").subscribe(data => { 
      debugger;
      this.MapData.next(data);
    });
  }
  getCurrentMap() {
    return this.angularFirestore.collection("maps").doc(this.mapId);
  }
  /** CRUD nodes */
  getNodes() {
    return this.getCurrentMap().snapshotChanges();
  }
  createNode(node: Node, conn: Connection) {

    let nodeRef = this.getCurrentMap()
      .collection("nodes")
      .doc(this.angularFirestore.createId()).ref;
    let connRef = this.getCurrentMap()
      .collection("conns")
      .doc(this.angularFirestore.createId()).ref;

      return this.angularFirestore.firestore.runTransaction((transaction) => {
        return transaction.get(nodeRef).then(snap => {
            transaction.set(nodeRef, node);
            transaction.set(connRef, conn);
        }).catch(error => {
            throw error;
        });
    }).then(() => {
        console.log('Transaction successfully committed.');
    }).catch((error) => {
        console.error('Transaction failed: ' + error);
    })

  }

  getNode(node: Node) {
    return this.angularFirestore
      .collection("nodes")
      .doc(node.id)
      .snapshotChanges();
  }
  updateNode(node: Node) {
    return this.angularFirestore
      .collection(`maps/${this.mapId}/items`)
      .doc(node.id)
      .update(<Node>{
        text: node.text,
        fx: node.fx,
        fy: node.fy
      });
  }
  deleteNode(node: Node) {
    return this.angularFirestore
      .collection("nodes")
      .doc(node.id)
      .delete();
  }
  /** CRUD connections */
  getConnections() {
    return this.angularFirestore.collection("conn").snapshotChanges();
  }
  createConnection(conn: Connection) {
    return this.angularFirestore.collection("conn").add(conn);
  }


  /**
   * create new map-entry
   * root node also created
   * @param  {Node} node
   */
  createNewMap(node: Node) {
    const _id = this.angularFirestore.createId();
    let mapRef = this.angularFirestore.collection("maps")
      .doc(_id).ref;

    if(node) {

    }else {
      let map = new Map({text:"sds"});

      mapRef.set(<Map> {
        text: 'amith-map'
      });

      this.mapId = _id;
      this.createNewNode(null);
    }
  }

  public createNewNode(node: Node) {
    //created a markdown and link
    const markdownId = this.angularFirestore.createId();
    let markdownRef = this.angularFirestore.collection("markdown").doc(markdownId).ref;
    markdownRef.set(<NodeData>{
      md: `## Edit Here..`
    });

    //create node
    
    let nodeRef = this.angularFirestore.collection("maps").doc(this.mapId)
    .collection("items")
    .doc(this.angularFirestore.createId()).ref;

    if(!node) {

      nodeRef.set(<Node> {
        text: "untitled",
        fx:0,
        fy:0,
        type: 'node',
        markdownid:markdownId
      });
      
    } else {
      //create connected node

      nodeRef.set(<Node> {
        text: "untitled",
        fx: node.fx,
        fy: node.fy + 100,
        type: 'node',
        markdownid:markdownId
      });

      let connRef = this.angularFirestore.collection("maps").doc(this.mapId)
      .collection("items")
      .doc(this.angularFirestore.createId()).ref;

      connRef.set(<Connection>{
        target: nodeRef.id,
        source: node.id,
        type: 'conn'
      })
    }

    this.loadMindMap();
  }

  /**
   * upload file to fire-storage and return a url
   * @param  {} file
   * @returns Promise
   */
  uploadFile(file): Promise<string> {
    
    const ref = this.angularFireStorage.storage.ref();
        //const file = document.querySelector('#photo').files[0]
        const name = (+new Date()) + '-' + file.name;
        const metadata = {
          contentType: file.type
        };
        const task = ref.child(name).put(file, metadata);
        
        return task
          .then(snapshot => snapshot.ref.getDownloadURL())
          .catch(console.error);
  }

  /** MARKDOWN */
  getNodeData(id: string){
    return this.angularFirestore
    .collection("markdown")
    .doc(id)
    .snapshotChanges()
    .pipe(
      map(this.convertSnapshots)
    ).subscribe(data => {
      this.NodeData.next(<NodeData>data[0]);
    });
  }
  updateNodeMarkdown(markdown: NodeData) {
    return this.angularFirestore
    .collection("markdown")
    .doc(markdown.id).set(markdown);
  }
}
