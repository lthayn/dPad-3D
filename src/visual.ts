/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    "use strict";
    import ISelectionId = powerbi.visuals.ISelectionId;

     /**
     * Interface for data points.
     *
     * @interface
     * @property {string} category          - Corresponding category of data value.
     * @property {ISelectionId} selectionId - Id assigned to data point for cross filtering
     *                                        and visual interaction.
     */
    interface CategoryDataPoint {
        category: string;
        selectionId: ISelectionId;
    };

    /**
     * Interface for viewmodel.
     *
     * @interface
     * @property {CategoryDataPoint[]} dataPoints - Set of data points the visual will render.
     */
    interface ViewModel {
        horizontalDataPoints: CategoryDataPoint[];
        verticalDataPoints: CategoryDataPoint[];
        dataPoints: CategoryDataPoint[];
        numberOfAxis: number;
        sortedBy: String;
        settings: VisualSettings;
    };

    /**
     * Interface for VisualChart settings.
     *
     * @interface
     * @property {{horizontal:boolean}} settings - Object property to enable or disable horizontal arrows.
     * @property {{vertical:boolean}} settings - Object property to enable or disable vertical arrows.
     * @property {{incremental:number}} settings - Object property that allows setting the incremental number.
     */
    interface VisualSettings {        
        settings: {
            horizontal: boolean;
            vertical: boolean;
            incremental: number;
        };
    }
    /**
     * Function that converts queried data into a view model that will be used by the visual.
     *
     * @function
     * @param {VisualUpdateOptions} options - Contains references to the size of the container
     *                                        and the dataView which contains all the data
     *                                        the visual had queried.
     * @param {IVisualHost} host            - Contains references to the host which contains services
     */
    function visualTransform(options: VisualUpdateOptions, host: IVisualHost): ViewModel {
        let dataViews = options.dataViews;
        
        let horizontalIdxInCategories = -1;
        let verticalIdxInCategories = -1;
        let rotationIdxInCategories = -1;
        let horizontalDisplayName = "";
        let verticalDisplayName = "";
        let rotationDisplayName = "";
        let sortedBy = "";

        //TODO: Refactoring    
        for (let i = 0; i < options.dataViews[0].metadata.columns.length; i++) {
            if (options.dataViews[0].metadata.columns[i].roles.hasOwnProperty('horizontalCategory')) {
                horizontalDisplayName = options.dataViews[0].metadata.columns[i].displayName;
                if(i == 0) sortedBy = "horizontal";
            }
            else if (options.dataViews[0].metadata.columns[i].roles.hasOwnProperty('verticalCategory')) {
                verticalDisplayName = options.dataViews[0].metadata.columns[i].displayName;
                if(i == 0) sortedBy = "vertical";
            }
            else if (options.dataViews[0].metadata.columns[i].roles.hasOwnProperty('rotationCategory')) {
                rotationDisplayName = options.dataViews[0].metadata.columns[i].displayName;
            }
        }

        for (let i = 0; i < dataViews[0].categorical.categories.length; i++)
        {
            if (dataViews[0].categorical.categories[i].source.displayName == horizontalDisplayName)
                horizontalIdxInCategories = i;
            else if (dataViews[0].categorical.categories[i].source.displayName == verticalDisplayName)
                verticalIdxInCategories = i;
            else if (dataViews[0].categorical.categories[i].source.displayName == rotationDisplayName)
                rotationIdxInCategories = i;
        }

        let horizontalValues: PrimitiveValue[] = [];
        let verticalValues: PrimitiveValue[] = [];
        let rotationValues: PrimitiveValue[] = [];
        let horizontalCategory: DataViewCategoryColumn;
        let verticalCategory: DataViewCategoryColumn;
        let rotationCategory: DataViewCategoryColumn;
        let numberOfAxis = 0;

        //TODO Refactoring
        if (horizontalIdxInCategories > -1) {
            horizontalCategory = dataViews[0].categorical.categories[horizontalIdxInCategories];
            horizontalValues = horizontalCategory.values;
            numberOfAxis++;
        }
        
        if (verticalIdxInCategories > -1) {
            verticalCategory = dataViews[0].categorical.categories[verticalIdxInCategories];
            verticalValues = verticalCategory.values;
            numberOfAxis++;
        }

        if (rotationIdxInCategories > -1) {
            rotationCategory = dataViews[0].categorical.categories[rotationIdxInCategories];
            rotationValues = rotationCategory.values;
            numberOfAxis++;
        }      
        
        
        let colorPalette: IColorPalette = host.colorPalette;
        let objects = dataViews[0].metadata.objects;

        let visualSettings: VisualSettings = {
            settings: {
                horizontal: getValue<boolean>(objects, 'settings', 'horizontal', true),
                vertical: getValue<boolean>(objects, 'settings', 'vertical', true),
                incremental: getValue<number>(objects, 'settings', 'incremental', 1)
            }
        }
        
        let dataPoints: CategoryDataPoint[] = [];
        let horizontalDataPoints: CategoryDataPoint[] = [];
        let verticalDataPoints: CategoryDataPoint[] = [];

        // Set of data points. Can have data for 1 or 2 axis (in this case the 
        // keys will be the axis on category 0)

        let valuesToBeTransformed = dataViews[0].categorical.categories[0].values;
        for (let i = 0, len = Math.max(valuesToBeTransformed.length); i < len; i++) {
            dataPoints.push({
                category: valuesToBeTransformed[i] + '',
                selectionId: host.createSelectionIdBuilder()
                    .withCategory(horizontalCategory, i)
                    .withMeasure('X' + horizontalCategory.values[i].toString() +
                                 'Y' + verticalCategory.values[i].toString() + 
                                 'V' + rotationCategory.values[i].toString())
                    .createSelectionId()
            });
        }

       if (horizontalIdxInCategories > -1)
       {
            for (let i = 0, len = Math.max(horizontalCategory.values.length); i < len; i++) {
                horizontalDataPoints.push({
                    category: horizontalCategory.values[i] + '',
                    selectionId: host.createSelectionIdBuilder()
                        .withCategory(horizontalCategory, i)
                        .createSelectionId()
                });
            }
       }

       if (verticalIdxInCategories > -1)
       {
           for (let i = 0, len = Math.max(verticalCategory.values.length); i < len; i++) {
                verticalDataPoints.push({
                    category: verticalCategory.values[i] + '',
                    selectionId: host.createSelectionIdBuilder()
                        .withCategory(verticalCategory, i)
                        .createSelectionId()
                });
            }
       }

        return {
            horizontalDataPoints: horizontalDataPoints,
            verticalDataPoints: verticalDataPoints,
            dataPoints : dataPoints,
            numberOfAxis: numberOfAxis,
            sortedBy: sortedBy,
            settings: visualSettings
        };
    }


    export class Visual implements IVisual {
        private visualSettings: VisualSettings;
        private host: IVisualHost;
        private svg: d3.Selection<SVGElement>;
        private controlsSVG: d3.Selection<SVGElement>;
        private selectionManager: ISelectionManager;
        private viewModel: ViewModel;
        private lastSelected: number;
        private lastHorizontal : number;
        private lastVertical : number;
        private lastRotation : number;
        
        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.selectionManager = options.host.createSelectionManager();
            this.lastSelected = 0;
            this.lastVertical = 1;
            this.lastHorizontal = 1;
            this.lastRotation = 0;
            
            this.svg = d3.select(options.element).append("svg")
                 .attr("width","100%")
                 .attr("height","100%");
          
            this.controlsSVG = this.svg.append('svg');
            
            // TODO create button class
            let buttonNames = ["up", "down", "left", "right"];
            let buttonPath = ["M 25,5 45,50 5,50 z", "M 25,50 45,5 5,5 Z", "M 5,25 50,5 50,45 Z", "M 50,25 5,45 5,5 z"];
            let buttonPosition = ["50,0", "50,95", "0,50", "95,50"];
            let buttonStep = [1, -1, -1, 1];
            let buttonDirection = ["d", "d", "r", "r"];

            for (let i = 0; i < buttonNames.length; ++i) {
                let container = this.controlsSVG.append('g')
                 .attr('class', "controls")
                 .attr('transform','translate(' + buttonPosition[i] + ')')
                 .attr('id', buttonNames[i])                 
                container.append("path")
                .attr("d", buttonPath[i])
                .on("click", ( ) => {
                    this.svg.select("#" + buttonNames[i]).transition().duration(100).attr('opacity',0.5)
                                   .transition().duration(100).attr('opacity',1);
                    this.step(buttonDirection[i], buttonStep[i]);
                });
             }
        }

        public update(options: VisualUpdateOptions) {
            
            let viewModel = this.viewModel = visualTransform(options, this.host);
            this.visualSettings = viewModel.settings;

            this.controlsSVG
                .attr("viewBox","0 0 150 150")
                .attr('preserveAspectRatio','xMinYMid'); 
            
            let showHorizontal = this.visualSettings.settings.horizontal;
            let showVertical = this.visualSettings.settings.vertical;         

            this.svg.selectAll("#right, #left").attr("visibility", showHorizontal ? "show" : "hidden");         
            this.svg.select("#up").attr("transform", showHorizontal ? 'translate(50, 0)' : 'translate(50, 15)');
            this.svg.select("#down").attr("transform", showHorizontal ? 'translate(50, 95)' : 'translate(50, 80)');
            
            this.svg.selectAll("#up, #down").attr("visibility", showVertical ? "show" : "hidden");   
            this.svg.select("#left").attr("transform", showVertical ? 'translate(0, 50)' : 'translate(15, 50)');
            this.svg.select("#right").attr("transform", showVertical ? 'translate(95, 50)' : 'translate(80, 50)');
    }

        public step(direction: string, step: number) {

            let newHorizontal = this.lastHorizontal;
            let newVertical = this.lastVertical;
            let newRotation = this.lastRotation;

            let displacement = 1;
            let rotationStep = 45;

            if (direction == "d")
            {
                newHorizontal += Math.round(displacement * Math.sin(this.lastRotation * Math.PI / 180)) * step;
                newVertical += Math.round(displacement * Math.cos(this.lastRotation * Math.PI / 180)) * step;
            }
            else if (direction == "r")
            {
                console.log("New rotation: " + newRotation)
                newRotation += rotationStep * step;
                if (newRotation < 0) newRotation += 360;
                else newRotation = newRotation % 360; 
            }

            console.log("Horizontal: " + newHorizontal)
            console.log("Vertical: " + newVertical)
            console.log("Rotation: " + newRotation)
            
            let newPositionMetadata = "X" + newHorizontal.toString() + 
                                      "Y" + newVertical.toString() + 
                                      "V" + newRotation.toString();

            let newSelectionId : ISelectionId;
            let foundId = false;

            for (let dataPoint of this.viewModel.dataPoints)
            {
                if (dataPoint.selectionId.getSelector().metadata == newPositionMetadata)
                {
                    newSelectionId = dataPoint.selectionId;
                    foundId = true;
                    break;
                }
            }

            if (foundId)
            {
                this.selectionManager.select(newSelectionId);
                this.lastHorizontal = newHorizontal;
                this.lastVertical = newVertical;
                this.lastRotation = newRotation;
            }
        }

        /** 
         * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the 
         * objects and properties you want to expose to the users in the property pane.
         * 
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
           let objectName = options.objectName;
            let objectEnumeration: VisualObjectInstance[] = [];

            switch(objectName) {            
                case 'settings': 
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            horizontal: this.visualSettings.settings.horizontal,
                            vertical: this.visualSettings.settings.vertical,
                            incremental: this.visualSettings.settings.incremental
                        },
                        validValues: {
                            incremental: {
                                numberRange: {
                                    min: 1,
                                    max: 100
                                }
                            }
                        },
                        selector: null
                    });
                break;
            };
            return objectEnumeration;
         }
    }
}