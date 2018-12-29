# D-Pad 3D

Simple Power BI visual that works like a directional pad for 3D games.

Tip: Generate the vertical, horizontal and rotation columns with the DAX below:

    Location Table = CROSSJOIN(
            SELECTCOLUMNS(GENERATESERIES(1;50);"X";[Value]);
            SELECTCOLUMNS(GENERATESERIES(1;75);"Y";[Value]);
            SELECTCOLUMNS(GENERATESERIES(0;330;45);"V";[Value])
            )
