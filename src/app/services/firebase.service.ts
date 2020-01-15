import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { MapNode } from "../models/mapnode";
import { Map } from "../models/map";
import { Connection } from "../models/connection";
import { map, flatMap } from "rxjs/operators";
import { combineLatest, Observable, Subject, of } from "rxjs";
import { AngularFireStorage } from '@angular/fire/storage';

@Injectable({
  providedIn: "root"
})
export class FirebaseService {
  currentMapId: string = "TemEZxXLlHecxrVAdz79";
  autoSave: number = 30;

  constructor(
    private angularFirestore: AngularFirestore,
    private angularFireStorage: AngularFireStorage
    ) {}


  getAllMaps():Observable<any> {
    return this.angularFirestore.collection("maps")
                .snapshotChanges()
                .pipe(
                  map(this.convertSnapshots)
                );
  }
  
  getCurrentMap() {
    return this.angularFirestore.collection("maps").doc(this.currentMapId);
  }

  createNode(node: MapNode, conn: Connection) {

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

  updateNode(node: MapNode) {
    return this.angularFirestore
      .collection(`maps/${this.currentMapId}/items`)
      .doc(node.id)
      .update(<MapNode>{
        text: node.text,
        fx: node.fx,
        fy: node.fy,
        markdown: node.markdown
      });
  }
  deleteNode(node: MapNode) {
    return this.angularFirestore
      .collection("nodes")
      .doc(node.id)
      .delete();
  }


  /**
   * create new map-entry
   * root node also created
   * @param  {Node} node
   */
  createNewMap(node: MapNode) {
    const _id = this.angularFirestore.createId();
    let mapRef = this.angularFirestore.collection("maps")
      .doc(_id).ref;

    if(node) {

    }else {
      let map = new Map({text:"sds"});

      mapRef.set(<Map> {
        text: 'amith-map'
      });

      this.currentMapId = _id;
      this.createNewNode(null);
    }
  }

  public createNewNode(node: MapNode) {

    //create node  
    let nodeRef = this.angularFirestore.collection("maps").doc(this.currentMapId)
    .collection("items")
    .doc(this.angularFirestore.createId()).ref;

    if(!node) {

      nodeRef.set(<MapNode> {
        text: "untitled",
        fx:0,
        fy:0,
        markdown:`## Edit Here..`
      });
      
    } else {
      //create connected node

      nodeRef.set(<MapNode> {
        text: "untitled",
        fx: node.fx,
        fy: node.fy + 100,
        markdown:`## Edit Here..`
      });

      let connRef = this.angularFirestore.collection("maps").doc(this.currentMapId)
      .collection("items")
      .doc(this.angularFirestore.createId()).ref;

      connRef.set(<Connection>{
        target: nodeRef.id,
        source: node.id,
        type: 'conn'
      })
    }
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
      .doc(id)
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
}
