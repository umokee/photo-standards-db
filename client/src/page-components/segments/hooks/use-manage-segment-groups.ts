import { useReducer, useState } from "react";

import { Segment, SegmentGroup, StandardDetail } from "@/types/contracts";
import { useParams } from "react-router-dom";
import { useSaveSegments } from "../api/save-segments";

interface SegmentState {
  key: string;
  id: string | null;
  name: string;
}

interface GroupState {
  key: string;
  id: string | null;
  name: string;
  hue: number;
  collapsed: boolean;
  segments: SegmentState[];
}

interface EditorState {
  groups: GroupState[];
  deletedGroupIds: Set<string>;
  deletedSegmentIds: Set<string>;
}

type Action =
  | { type: "group/add" }
  | { type: "group/remove"; key: string }
  | { type: "group/toggle"; key: string }
  | { type: "group/update-name"; key: string; value: string }
  | { type: "group/update-hue"; key: string; value: number }
  | { type: "segment/add"; groupKey: string }
  | { type: "segment/remove"; groupKey: string; segKey: string }
  | { type: "segment/update-name"; groupKey: string; segKey: string; value: string };

const uid = () => crypto.randomUUID();

const initGroups = (segmentGroups: SegmentGroup[], segments: Segment[]): GroupState[] =>
  segmentGroups.map((group) => ({
    key: group.id,
    id: group.id,
    name: group.name,
    hue: group.hue,
    collapsed: true,
    segments: segments
      .filter((segment) => segment.segment_group_id === group.id)
      .map((segment) => ({
        key: segment.id,
        id: segment.id,
        name: segment.name,
      })),
  }));

const createInitialState = (standard: StandardDetail): EditorState => ({
  groups: initGroups(standard.segment_groups, standard.segments),
  deletedGroupIds: new Set<string>(),
  deletedSegmentIds: new Set<string>(),
});

const serializeGroupsForSave = (groups: GroupState[]) =>
  groups.map((group) => ({
    id: group.id ?? undefined,
    name: group.name.trim(),
    hue: group.hue,
    segments: group.segments
      .filter((segment) => segment.name.trim())
      .map((segment) => ({
        id: segment.id ?? undefined,
        name: segment.name.trim(),
      })),
  }));

const createEmptyGroup = (): GroupState => ({
  key: uid(),
  id: null,
  name: "",
  hue: 210,
  collapsed: false,
  segments: [],
});

const createEmptySegment = (): SegmentState => ({
  key: uid(),
  id: null,
  name: "",
});

const updateGroup = (
  groups: GroupState[],
  key: string,
  updater: (group: GroupState) => GroupState
) => groups.map((group) => (group.key === key ? updater(group) : group));

const updateSegment = (
  groups: GroupState[],
  groupKey: string,
  segmentKey: string,
  updater: (segment: SegmentState) => SegmentState
) =>
  updateGroup(groups, groupKey, (group) => ({
    ...group,
    segments: group.segments.map((segment) =>
      segment.key === segmentKey ? updater(segment) : segment
    ),
  }));

const removeGroupFromState = (state: EditorState, key: string): EditorState => {
  const group = state.groups.find((item) => item.key === key);
  if (!group) return state;

  const deletedGroupIds = new Set(state.deletedGroupIds);
  const deletedSegmentIds = new Set(state.deletedSegmentIds);

  if (group.id) {
    deletedGroupIds.add(group.id);
  }

  for (const segment of group.segments) {
    if (segment.id) {
      deletedSegmentIds.add(segment.id);
    }
  }

  return {
    groups: state.groups.filter((item) => item.key !== key),
    deletedGroupIds,
    deletedSegmentIds,
  };
};

const removeSegmentFromState = (
  state: EditorState,
  groupKey: string,
  segmentKey: string
): EditorState => {
  const deletedSegmentIds = new Set(state.deletedSegmentIds);

  return {
    ...state,
    deletedSegmentIds,
    groups: state.groups.map((group) => {
      if (group.key !== groupKey) return group;

      const segment = group.segments.find((item) => item.key === segmentKey);
      if (segment?.id) {
        deletedSegmentIds.add(segment.id);
      }

      return {
        ...group,
        segments: group.segments.filter((item) => item.key !== segmentKey),
      };
    }),
  };
};

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "group/add":
      return {
        ...state,
        groups: [...state.groups, createEmptyGroup()],
      };

    case "group/remove":
      return removeGroupFromState(state, action.key);

    case "group/toggle":
      return {
        ...state,
        groups: updateGroup(state.groups, action.key, (group) => ({
          ...group,
          collapsed: !group.collapsed,
        })),
      };

    case "group/update-name":
      return {
        ...state,
        groups: updateGroup(state.groups, action.key, (group) => ({
          ...group,
          name: action.value,
        })),
      };

    case "group/update-hue":
      return {
        ...state,
        groups: updateGroup(state.groups, action.key, (group) => ({
          ...group,
          hue: action.value,
        })),
      };

    case "segment/add":
      return {
        ...state,
        groups: updateGroup(state.groups, action.groupKey, (group) => ({
          ...group,
          segments: [...group.segments, createEmptySegment()],
        })),
      };

    case "segment/remove":
      return removeSegmentFromState(state, action.groupKey, action.segKey);

    case "segment/update-name":
      return {
        ...state,
        groups: updateSegment(state.groups, action.groupKey, action.segKey, (segment) => ({
          ...segment,
          name: action.value,
        })),
      };

    default:
      return state;
  }
}

export const useManageSegmentGroups = (standard: StandardDetail) => {
  const { imageId, groupId } = useParams();
  const saveSegmentsMutation = useSaveSegments({ imageId, groupId });

  const [state, dispatch] = useReducer(reducer, standard, createInitialState);
  const [activeColorKey, setActiveColorKey] = useState<string | null>(null);

  const toggleColorPicker = (key: string) => {
    setActiveColorKey((prev) => (prev === key ? null : key));
  };

  const closeColorPicker = () => {
    setActiveColorKey(null);
  };

  const groupActions = {
    add: () => dispatch({ type: "group/add" } as const),
    remove: (key: string) => dispatch({ type: "group/remove", key } as const),
    toggle: (key: string) => dispatch({ type: "group/toggle", key } as const),
    updateName: (key: string, value: string) =>
      dispatch({ type: "group/update-name", key, value } as const),
    updateHue: (key: string, value: number) =>
      dispatch({ type: "group/update-hue", key, value } as const),
  };

  const segmentActions = {
    add: (groupKey: string) => dispatch({ type: "segment/add", groupKey } as const),
    remove: (groupKey: string, segKey: string) =>
      dispatch({ type: "segment/remove", groupKey, segKey } as const),
    updateName: (groupKey: string, segKey: string, value: string) =>
      dispatch({ type: "segment/update-name", groupKey, segKey, value } as const),
  };

  const save = async () => {
    await saveSegmentsMutation.mutateAsync({
      standardId: standard.id,
      groups: serializeGroupsForSave(state.groups),
      deletedGroupIds: [...state.deletedGroupIds],
      deletedSegmentIds: [...state.deletedSegmentIds],
    });

    return true;
  };

  return {
    groups: state.groups,
    saving: saveSegmentsMutation.isPending,
    activeColorKey,
    toggleColorPicker,
    closeColorPicker,
    groupActions,
    segmentActions,
    save,
  };
};
