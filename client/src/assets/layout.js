
export const flex_layout_default = {
    global: { "tabEnableFloat": true, "tabEnableRenderOnDemand": false },
  
    "borders": [
      {
        "type": "border",
        "selected": 0,
        "location": "left",
        "children": [
          {
            "type": "tab",
            "id": "#24",
            "name": "Navigation",
            "component": "Navigation",
            "enableClose": false
          },
          {
            "type": "tab",
            "id": "#3",
            "name": "Options",
            "component": "Options",
            "config": {
              "id": "1"
            },
            "enableClose": false
          }
        ]
      },
      // {
      //   "type": "border",
      //   "selected": -1,
      //   "location": "bottom",
      //   "children": [
      //     {
      //       "type": "tab",
      //       "id": "#2",
      //       "name": "Activity Blotter",
      //       "component": "grid",
      //       "config": {
      //         "id": "1"
      //       },
      //       "enableClose": false
      //     },
      //     {
      //       "type": "tab",
      //       "id": "#1",
      //       "name": "Execution Blotter",
      //       "component": "grid",
      //       "config": {
      //         "id": "1"
      //       },
      //       "enableClose": false
      //     }
      //   ]
      // }
    ],
    layout: {
      type: "row",
      // weight: 100,
      children: [
        {
          type: "tabset",
          weight: 75,
          children: [
            {
              type: "tab",
              name: "Modeling",
              component: "Modeling",
              "enableClose": false
            }
          ]
        },
        {
          type: "tabset",
          children: [
            // {
            //   type: "tab",
            //   name: "Modeling",
            //   component: "Modeling",
            //   "enableClose": false
            // },
            {
              type: "tab",
              name: "Simulation",
              component: "Simulation",
              "enableClose": false
            }
          ]
        }
      ]
    }
  };