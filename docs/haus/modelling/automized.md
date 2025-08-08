---
id: automized
title: Fully Automized Algorithm
sidebar_position: 5
     
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import VideoPlayer from '@site/src/components/VideoPlayer';

What type of corner the wall has automatically recognized and set on UI, letting the user choose the kind of block they are wishing to use. 

<Tabs groupId="blockCorner">
  <TabItem value="closedCorner" label="Closed Corner Block">
    If no connecting wall is detected, the corner is automatically closed.
<VideoPlayer src="/video/haus/corner_0.mp4" />

  </TabItem>
  <TabItem value="openCorner" label="Open Corner Block">
    If a connecting wall is detected, the corner is automatically opened.
  </TabItem>
  <TabItem value="existingCornerBlock" label="Existing Corner Block">
    If a corner block already exists, the algorithm recognizes it and adjusts the placement accordingly.
  </TabItem>
  <TabItem value="connectingWallBlock" label=" Connecting Wall Block">
    If a corner block already exists, the algorithm recognizes it and adjusts the placement accordingly.
  </TabItem>
    
</Tabs>

