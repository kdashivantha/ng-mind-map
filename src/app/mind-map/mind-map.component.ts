import { Component, OnInit, AfterViewInit, OnChanges, ViewChild } from '@angular/core';

import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  select,
  selectAll,
  event,
  zoom,
  zoomIdentity
} from "d3";
import {
  d3Connections,
  d3Nodes,
  d3Drag,
  d3PanZoom,
  onTick,
  d3NodeClick
} from "./utils/d3";

import {
  TransformState
} from "./utils/dimensions"


import { getDimensions, getViewBox } from "./utils/dimensions";
import nodeToHTML from "./templates/nodeToHTML";
import { FirebaseService } from '../services/firebase.service';

import { MapNode } from '../models/mapnode';
import { Connection } from '../models/connection';
import { Map } from '../models/map';
import { MindMapService } from '../services/mindmap.service';

@Component({
  selector: 'app-mind-map',
  templateUrl: './mind-map.component.html',
  styleUrls: ['./mind-map.component.scss']
})
export class MindMapComponent implements OnInit, AfterViewInit, OnChanges {

  @ViewChild("mindMapEl", {static: false}) svgEl: any;
  nodes: any[] = [];
  connections: any[] = [];
  editable: boolean = true;
  simulation = null;
  svg: any = {};

  map: Map;

  constructor(private mindMapService: MindMapService, private fb: FirebaseService) { }

  ngOnInit() {

    this.mindMapService.loadMindMap();

    this.mindMapService.MapData.subscribe(data => {
      debugger;
      this.map = new Map(data[0]);
      this.nodes = this.map.getNodes();
      this.connections = this.map.getConnections();

      this.renderMap();
    });
  }

  ngAfterViewInit() {
    this.svg = this.svgEl.nativeElement;
  }

  ngOnChanges() {
    zoom().transform(select(this.svg), zoomIdentity);
    this.renderMap();
  }
  // methods
  prepareNodes() {
    const render = node => {
      node.html = nodeToHTML(node);

      const dimensions = getDimensions(node.html, {}, "mindmap-node");
      //@ts-ignore
      node.width = dimensions.width;
      //@ts-ignore
      node.height = dimensions.height;
    };

    this.nodes.forEach(node => render(node));
  }

  /**
   * Add new class to nodes, attach drag behevior,
   * and start simulation.
   */
  prepareEditor(svg, conns, nodes) {
    nodes
      .attr("class", "mindmap-node mindmap-node--editable")
      .attr("id", d => d.uid)
      .on("dbclick", node => {
        node.fx = null;
        node.fy = null;
      });

    nodes.call(d3Drag(this.simulation, svg, nodes));
    // .on('end', (d)=> {
    //   console.log('drag end from drag drag'+ event);
    // }));

    nodes.on("click", (d, i) => {
      if (event.defaultPrevented) return; // click suppressed
      this.nodeClickEvent(d3NodeClick(d, i), d);
    });

    // Tick the simulation 100 times
    for (let i = 0; i < 100; i += 1) {
      this.simulation.tick();
    }

    setTimeout(() => {
      this.simulation.alphaTarget(0.5).on("tick", () => onTick(conns, nodes));
    }, 200);
  }

  /**
   * Render mind map unsing D3
   */
  renderMap() {
    // Create force simulation to position nodes that have
    // no coordinate, and add it to the component state
    this.simulation = forceSimulation()
      .force(
        "link",
        forceLink().id((node: any) => node.id)
      )
      .force("charge", forceManyBody())
      .force("collide", forceCollide().radius(200));

    const svg = select(this.svg);

    const currentElements = svg.selectAll("svg > g");
    let transformState =  null;
    if(!currentElements.empty()){
      transformState = svg.selectAll("svg > g").attr("transform")
    }
    //, event.transform)
    // Clear the SVG in case there's stuff already there.
    svg.selectAll("*").remove();

    // Add subnode group
    svg.append("g").attr("id", "mindmap-subnodes");
    
        //arrow
    svg.append("svg:defs").append("svg:marker")
      .attr("id", "triangle")
      .attr("refX", 6)
      .attr("refY", 6)
      .attr("markerWidth", 30)
      .attr("markerHeight", 30)
      .attr("markerUnits","userSpaceOnUse")
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M 0 0 12 6 0 12 3 6")
      .style("fill", "#6a6a6a");


    this.prepareNodes();

    // Bind data to SVG elements and set all the properties to render them
    const connections = d3Connections(svg, this.connections);
    const { nodes } = d3Nodes(svg, this.nodes);

    nodes.append("title").text(node => node.uid);

    // Bind nodes and connections to the simulation
    this.simulation
      .nodes(this.nodes)
      .force("link")
      .links(this.connections);

    if (this.editable) {
      this.prepareEditor(svg, connections, nodes);
    }

    // Tick the simulation 100 times
    for (let i = 0; i < 100; i += 1) {
      this.simulation.tick();
    }

    onTick(connections, nodes);

    svg
      //.attr("viewBox", getViewBox(nodes.data()))
      .call(d3PanZoom(svg))
      .on("dbClick.zoom", null);
    
    if(transformState)
      svg.selectAll("svg > g").attr("transform", transformState);
  }

  /**
   * node mouse click events
   */
  nodeClickEvent(event, node) {
    switch (event) {
      case "add":
        this.addNewNode(node);
        break;
      case "edit":
        this.editNode(node);
        break;
      case "remove":
        this.removeNode(node);
        break;
      case "click":
        this.clickNode(node);
        break;
    }
  }

  /**
   * click on node text
   */
  clickNode(d) { 
    //add css-selected class
    selectAll("div.node-body")
      .classed("node--selected", false); 
    select(`#node-${d.id}`)
      .classed("node--selected", true);

    this.mindMapService.NodeData.next((<MapNode>d));
  }
  /**
   * add new child nodes
   */
  addNewNode(target) {
    this.mindMapService.createNewNode(new MapNode(target));
  }
  /**
   * remove a node
   * todo: before remove nodes check all link
   */
  removeNode(d) {

    //test clone
    debugger;
    var clonedMap = this.map.getDeepCloneMap(<MapNode>d);

    debugger;
    this.fb.deleteNode(<MapNode>d);
  }
  /**
   * edit node text
   */
  editNode(d) {
    var nodeTitle = prompt("node text", d.text);
    if (nodeTitle != null) {
      d.text = nodeTitle;
      this.fb.updateNode(<MapNode>d);
      this.renderMap();
    }
  }

  updateCoordintesOnDragEnd(d){
    //debugger;
    this.fb.updateNode(<MapNode>d);
    //this.renderMap();
  }
}
