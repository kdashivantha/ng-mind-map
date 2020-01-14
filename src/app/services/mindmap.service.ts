import { IMap } from './../models/map';
import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { Map } from "../models/map";
import { Connection } from "../models/connection";
import { combineLatest, Observable, Subject, of, from } from "rxjs";
import { AngularFireStorage } from "@angular/fire/storage";
import * as _ from "lodash";
import { firestore } from 'firebase';
import { MapNode } from '../models/mapnode';
import { FirebaseService } from './firebase.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: "root"
})
export class MindMapService {
  mapId: string = "pNyCX5lNKw6jSPuTMg9R5";

  //used when linking
  linkedMapId: string = null;

  autoSave: number = 30;

  public MapData: Subject<any> = new Subject<any>();
  public NodeData: Subject<any> = new Subject<any>();

  private Map:Map = null;

  constructor(
    private fb: FirebaseService,
    private angularFirestore: AngularFirestore
  ) {}


  loadMindMap() {
    this.fb.getDocumentsWithSubcollection<Map>("maps",this.mapId,"nodes").subscribe(data => { 
      debugger;
      this.Map = new Map(data[0]);
      this.MapData.next(data);
    });
  }

  getCurrentMap() {
    return this.angularFirestore.collection("maps").doc(this.mapId);
  }


  updateNode(node: MapNode) {
    const nodeRef = this.getNodeRef(node.id);
    nodeRef.update(node.dto);
  }
  
  deleteNode(node: MapNode) {
    return this.angularFirestore
      .collection("nodes")
      .doc(node.id)
      .delete();
  }




  private nodesCollection(mapId?:string) {
    return this.angularFirestore.collection("maps").doc(mapId || this.mapId).collection("nodes");
  }
  private getNodeRef(id?: string, mapId?:string) {
    return this.nodesCollection(mapId).doc(id || this.angularFirestore.createId()).ref;
  }
  /**
   * create new map-entry
   * root node also created
   * @param  {Node} node
   */
  createMindMap(node: MapNode): Observable<any> {
    this.linkedMapId = this.angularFirestore.createId();
    let mapRef = this.angularFirestore.collection("maps").doc(this.linkedMapId).ref;

    const batch = this.angularFirestore.firestore.batch();
    batch.set(mapRef,new Map().dto);
    

    if (node) {
      //update this node as a mapLinkedNode
      const nodeRef = this.getNodeRef(node.id, this.mapId);
      batch.update(nodeRef,{"mapReferenceId":this.linkedMapId});

      this.cloneLinkedNode(node,batch);

    } else {

      this.createNewNode(null,batch);
    }

    return from(batch.commit()).pipe(map(response => this.linkedMapId));
  }

  public createNewNode(parentNode: MapNode, batch?:firestore.WriteBatch) {

    const hasParentBatch = batch != null;
    if(!hasParentBatch){
      batch = this.angularFirestore.firestore.batch();
    }

    //create node
    const nodeRef = this.getNodeRef(null, parentNode?this.mapId:this.linkedMapId);
    let _mapNode = new MapNode();

    if (parentNode) {
      //create connected node
      _mapNode.fx = parentNode.fx;
      _mapNode.fy = parentNode.fy + 100;

      const parentNodeRef = this.getNodeRef(parentNode.id, this.mapId);
      parentNode.connections.push(nodeRef.id);
      batch.update(parentNodeRef,parentNode.dto);
    }

    batch.set(nodeRef,_mapNode.dto);
    
    if(!hasParentBatch){
      batch.commit();
    }
  }

  public cloneLinkedNode(node: MapNode, batch?:firestore.WriteBatch): string {
      //traverse given node and build a clone
    debugger;
      const nodeRef = this.getNodeRef(null, this.linkedMapId);
      let _mapNode = new MapNode(node.dto);

      let results = [];
      _.forEach(node.connections, (conn:string) => {
        debugger;
        let connNode = _.find(this.Map.getNodes(), { id: conn});

        results.push(this.cloneLinkedNode(connNode,batch));
      });

      _mapNode.connections = results;
      batch.set(nodeRef,_mapNode.dto);
      //delete cloned-nodes

      return nodeRef.id;
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
