<script lang="ts">
        export let type: string;
        export let heading: string | null = null;
        export let headingSize: string = "1rem";
        export let showHeading: boolean = false;

        export let labels: string[];
        export let showLabels: boolean = false;

        export let dataSpacing: number = 0;
        export let hideData: boolean = false;
        export let showDataAxis: boolean = false;
        export let showDataOnHover: boolean = false;

        export let datasets: any[]

        export let showLegend: boolean = false;
        export let legendInline: boolean = true;
        export let legendType: string = "square";

        export let showTooltips: boolean = false;
        export let resolveDataTooltip: null | ((value: any, label: string, datasetName: string, rowIndex: number, colIndex: number, hasMultipleDatasets: boolean) => string) = 
        (value, label, datasetName, rowIndex, colIndex, hasMultipleDatasets = false) => {
            return ( datasetName && hasMultipleDatasets ? datasetName : label ) + ": " + value;
        };

        export let reverse: boolean = false;
        export let stacked: boolean = false;

        export let classes: string | null = null;

        export let color: string | null = null;

        export let formatDataValue: (value: any) => string = (value) => value as string;
        export let resolveDataColor: null | ((value: any, label: string, datasetName: string, rowIndex: number, colIndex: number, hasMultipleDatasets: boolean) => string | null) = () => null;
        

        $: style = function()
        {
            let style = `--heading-size: ${headingSize};`

            if (color){
                style += `--color: ${color};`;
            }

            return style;
        }();

        $: legendClasses = function(){
            if (showLegend){
                return "charts-css legend " + ( legendInline ? 'legend-inline':'' ) + " legend-" + legendType;
            }
            return "";
        }();

        $: chartClasses = function()
        {
            let propClasses: any = {
                "multiple": datasets.length > 1,
                "reverse": reverse,
                "show-heading": showHeading,
                "hide-data": hideData,
                "show-data-on-hover": showDataOnHover,
                "show-data-axis": showDataAxis,
                "show-labels": showLabels,
                "stacked": stacked,
            };

            if (dataSpacing){
                propClasses[ "data-spacing-" + dataSpacing ] = true;
            }

            let propClassesString = Object.keys(propClasses).reduce((carry, chartClass) => {
                if (propClasses[chartClass]){
                    carry += " " + chartClass;
                }
                return carry;
            }, "");

            let chartClasses = `charts-css ${type} ` + propClassesString + " " + ( classes ? classes : '' );

            return chartClasses.trim();
        }();

        $: datasetsCount = function()
        {
            return datasets.length;
        }();

        $: hasHeading = function()
        {
            return !!$$slots.heading;
        }();

        /**
         * Converts from datasets schema to Charts.CSS rendering.
         * @return {array}
         */
        $: rows = function()
        {
            /**
             * get highest value in values, so we can calculate scale between 0.0 and 1.0
             * @type {Number}
             */
            const max = Math.max(...datasets.reduce((carry, dataset) => {
                carry = carry.concat(dataset.values);
                return carry;
            }, []));

            const chartType = type;

            return datasets.reduce((carry, dataset, index) => {

                /**
                 * Map dataset to each column
                 */
                dataset.values.forEach((value:any, valueIndex:number) => {
                    if (typeof carry[valueIndex] === "undefined"){
                        carry[valueIndex] = [];
                    }

                    let tooltip = resolveDataTooltip && showTooltips ?
                        resolveDataTooltip(value, labels[valueIndex], dataset.name, valueIndex, valueIndex, datasets.length > 1) :
                        null
                    ;

                    let mappedValue = {
                        valueRaw: value,
                        valueIndex: valueIndex,
                        datasetName: dataset.name,
                        datasetIndex: index,
                        label: labels[valueIndex],
                        tooltip: tooltip,
                    } as any;

                    if (chartType === "column" || chartType === "bar"){
                        mappedValue.size = value / max;
                    }

                    if (chartType === "area" || chartType === "line"){
                        mappedValue.start = value / max;
                        mappedValue.size = dataset.values[valueIndex + 1] ? dataset.values[valueIndex + 1] / max : 0;
                    }

                    carry[valueIndex].push(mappedValue);
                });

                return carry;
            }, []);
        }();

        /**
         * Returns the mapped rendering CSS style for the given value, row and column.
         * @param value
         * @param rowIndex
         * @param colIndex
         * @return {{"--size", "--start"}}
         */
        function resolveDataStyle(value:any, rowIndex: number, colIndex: number)
        {
            let style = {
                '--start': value.start,
                '--size': value.size,
            } as any;

            if (resolveDataColor){
                const color = resolveDataColor(value, value.label, value.datasetName, rowIndex, colIndex, datasetsCount > 1);

                if (color){
                    style["--color"] = color;
                }
            }
            return Object.entries(style).map(([key, value]) => {
                return key + ":" + value;
            }).join(";");
        }
</script>

<div class="svelte-charts-css" style="{style}">
    <table
        class="{chartClasses}"
    >
        {#if heading !== null || $$slots.heading}
            <caption class="heading">
                <slot name="heading" heading="{heading}">{heading}</slot>
            </caption> 
        {/if}
        

        <tbody>
            {#each rows as row,rowIndex (rowIndex) }
            <tr>
                <th scope="row">
                    <slot name="label" label="{labels[rowIndex]}" labelIndex="{rowIndex}">{labels[rowIndex]}</slot>
                </th>

                {#each row as value, colIndex (colIndex)}
                    <td style = "{resolveDataStyle(value, rowIndex, colIndex)}">
                        <span class="data">
                            <slot name="data" value="{value}" formattedValue="{formatDataValue(value.valueRaw)}">
                                {formatDataValue(value.valueRaw)}
                            </slot>
                        </span>
                        {#if value.tooltip}
                            <span class="tooltip">
                                {value.tooltip}
                            </span>
                        {/if}
                    </td>
                {/each}
            </tr>
            {/each}
        </tbody>
    </table>

    {#if ( $$slots.legend || showLegend ) && datasets.length > 0}
    <slot
        name="legend"
        datasets="{datasets}"
    >
        <ul class="{legendClasses}">
            {#each datasets as dataset, index (index + '' + datasets.length)}
            <li>
                {dataset.name}
            </li>
            {/each}
        </ul>
    </slot>
    {/if}
</div>

<style>
    .svelte-chart-css {
        width: 100%;
        height: 100%;
    }
</style>
