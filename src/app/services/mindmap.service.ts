import { IMap } from './../models/map';
import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { Map } from "../models/map";
import { Connection } from "../models/connection";
import { combineLatest, Observable, Subject, of } from "rxjs";
import { AngularFireStorage } from "@angular/fire/storage";
import * as _ from "lodash";
import { firestore } from 'firebase';
import { MapNode } from '../models/mapnode';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: "root"
})
export class MindMapService {
  mapId: string = "TpQve4i6X6eXeThv2hkV";
  autoSave: number = 30;

  public MapData: Subject<any> = new Subject<any>();
  public NodeData: Subject<any> = new Subject<any>();

  constructor(
    private fb: FirebaseService,
    private angularFirestore: AngularFirestore
  ) {}


  loadMindMap() {
    this.fb.getDocumentsWithSubcollection<Map>("maps",this.mapId,"nodes").subscribe(data => { 
      debugger;
      this.MapData.next(data);
    });
  }

  getCurrentMap() {
    return this.angularFirestore.collection("maps").doc(this.mapId);
  }


  updateNode(node: MapNode) {
    return this.angularFirestore
      .collection(`maps/${this.mapId}/items`)
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




  private get nodesCollection() {
    return this.angularFirestore.collection("maps").doc(this.mapId).collection("nodes");
  }
  private getNodeRef(id?: string) {
    return id == null ? this.nodesCollection.doc(this.angularFirestore.createId()).ref:
                        this.nodesCollection.doc(id).ref;
  }
  /**
   * create new map-entry
   * root node also created
   * @param  {Node} node
   */
  createMindMap(node: MapNode) {
    const _id = this.angularFirestore.createId();
    let mapRef = this.angularFirestore.collection("maps").doc(_id).ref;

    const batch = this.angularFirestore.firestore.batch();
    batch.set(mapRef,new Map().dto);
    this.mapId = _id;

    if (node) {
      //traverse given node and build a clone

      //update mapId

      //delete cloned-nodes

    } else {
      this.createNewNode(null,batch);
    }

    batch.commit();
  }

  public createNewNode(parentNode: MapNode, batch?:firestore.WriteBatch) {

    const hasParentBatch = batch != null;
    if(!hasParentBatch){
      batch = this.angularFirestore.firestore.batch();
    }

    //create node
    const nodeRef = this.getNodeRef();
    let _mapNode = new MapNode();

    if (parentNode) {
      //create connected node
      _mapNode.fx = parentNode.fx;
      _mapNode.fy = parentNode.fy + 100;

      const parentNodeRef = this.getNodeRef(parentNode.id);
      parentNode.connections.push(nodeRef.id);
      batch.update(parentNodeRef,parentNode.dto);
    }

    batch.set(nodeRef,_mapNode.dto);
    
    if(!hasParentBatch){
      batch.commit();
    }
  }

  saveCloneMap(clone: Map, linkedNode: MapNode) {
    debugger;

    //should be a bulk operation
    const batch = this.angularFirestore.firestore.batch();
    //batch.
    //save mapObj
    const mapId = this.angularFirestore.createId();
    const mapRef = this.angularFirestore.collection("maps").doc(mapId).ref;

    
    const linkedNodeRef = this.angularFirestore.collection("maps").doc('TemEZxXLlHecxrVAdz79').collection("items").doc(linkedNode.id).ref;
    clone.id = mapId;
    linkedNode.mapReferenceId = mapId;

    batch.update(linkedNodeRef, { "mapId": clone.id});
    batch.set(mapRef, clone); //should only the map part
    
    //update cloneNode with mapId

    //save clone nodes

    //save clone conns

    const batch$ = of(batch.commit);
    batch$.subscribe();
  }

}
