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
  private currentMapId: string = null;
  private Map:Map = null;

  //used when linking
  private linkedMapId: string = null;

  autoSave: number = 30;

  public MapData: Subject<any> = new Subject<any>();
  public NodeData: Subject<any> = new Subject<any>();

  

  constructor(
    private fb: FirebaseService,
    private angularFirestore: AngularFirestore
  ) {}

  public set CurrentMapId(id:string){
    this.currentMapId = id;
  }

  loadMindMap() {
    if(!this.currentMapId) return;
    this.fb.getDocumentsWithSubcollection<Map>("maps",this.currentMapId,"nodes").subscribe(data => { 
      debugger;
      this.Map = new Map(data[0]);
      this.MapData.next(data);
    });
  }

  getCurrentMap() {
    return this.angularFirestore.collection("maps").doc(this.currentMapId);
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




  private nodesCollection(currentMapId?:string) {
    return this.angularFirestore.collection("maps").doc(currentMapId || this.currentMapId).collection("nodes");
  }
  private getNodeRef(id?: string, currentMapId?:string) {
    return this.nodesCollection(currentMapId).doc(id || this.angularFirestore.createId()).ref;
  }
  /**
   * create new map-entry
   * root node also created
   * @param  {Node} node
   */
  public createMindMap(node: MapNode): Observable<any> {
    this.linkedMapId = this.angularFirestore.createId();
    let mapRef = this.angularFirestore.collection("maps").doc(this.linkedMapId).ref;

    const batch = this.angularFirestore.firestore.batch();
    batch.set(mapRef,new Map().dto);
    

    if (node) {
      //update map data with this.node.text
      batch.update(mapRef,{"text":node.text});

      this.cloneLinkedNode(node,batch,true);

    } else {

      this.createNewNode(null,batch);
    }

    return from(batch.commit()).pipe(map(() => this.linkedMapId));
  }

  public createNewNode(parentNode: MapNode, batch?:firestore.WriteBatch) {

    const hasParentBatch = batch != null;
    if(!hasParentBatch){
      batch = this.angularFirestore.firestore.batch();
    }

    //create node
    const nodeRef = this.getNodeRef(null, parentNode?this.currentMapId:this.linkedMapId);
    let _mapNode = new MapNode();

    if (parentNode) {
      //create connected node
      _mapNode.fx = parentNode.fx;
      _mapNode.fy = parentNode.fy + 100;

      const parentNodeRef = this.getNodeRef(parentNode.id, this.currentMapId);
      parentNode.connections.push(nodeRef.id);
      batch.update(parentNodeRef,parentNode.dto);
    }

    batch.set(nodeRef,_mapNode.dto);
    
    if(!hasParentBatch){
      batch.commit();
    }
  }

  private cloneLinkedNode(node: MapNode, batch?:firestore.WriteBatch, isMapNode?:boolean): string {
      //traverse given node and build a clone
      const nodeRef = this.getNodeRef(null, this.linkedMapId);
      let _mapNode = new MapNode(node.dto);

      let results = [];
      _.forEach(node.connections, (conn:string) => {
        let connNode = _.find(this.Map.getNodes(), { id: conn});     
        results.push(this.cloneLinkedNode(connNode,batch,false));
      });

      _mapNode.connections = results;
      batch.set(nodeRef,_mapNode.dto);

      const clonedNodeRef = this.getNodeRef(node.id, this.currentMapId);
      
      if (isMapNode) { //update mapLinkedNode
        batch.update(clonedNodeRef,{
          "mapReferenceId":this.linkedMapId,
          "connections": []
        });
      } else { //delete cloned-nodes
        batch.delete(clonedNodeRef);
      }

      return nodeRef.id;
  }

}
