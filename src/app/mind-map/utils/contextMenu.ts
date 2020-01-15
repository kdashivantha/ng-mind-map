import {
    select,
    selectAll,
    event
  } from "d3";

export interface IMenu{
    title: string;
    action: any;
    disabled: boolean;
    render(data:any, menuitem:IMenu): string;
}

const d3ContextMenu = (menu, openCallback) => {

	// create the div element that will hold the context menu
	select('body').selectAll('.d3-context-menu').data([1])
		.enter()
		.append('div')
		.attr('class', 'd3-context-menu');

	// close menu
	select('body').on('click.d3-context-menu', function() {
		select('.d3-context-menu').style('display', 'none');
	});

	// this gets executed when a contextmenu event occurs
	return function(data, index) {	
		var elm = this;

		selectAll('.d3-context-menu').html('');
		var list = selectAll('.d3-context-menu').append('ul');
		list.selectAll('li').data(menu).enter()
			.append('li')
			.html((d:IMenu) =>{
                return d.render? d.render(data, d): d.title;
			})
			.on('click', function(d:IMenu, i) {
                if(!d.disabled) {
				    d.action(elm, data, index);
                    select('.d3-context-menu').style('display', 'none');
                }
			});

		// the openCallback allows an action to fire before the menu is displayed
		// an example usage would be closing a tooltip
		if (openCallback) openCallback(data, index);

		// display context menu
		select('.d3-context-menu')
			.style('left', (event.pageX - 2) + 'px')
			.style('top', (event.pageY - 2) + 'px')
			.style('display', 'block');

		event.preventDefault();
	};
};

export default d3ContextMenu;