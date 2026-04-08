import { useReducer, useState } from "react";

import { Segment, SegmentGroup, StandardDetail } from "@/types/contracts";
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
    collapsed: false,
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

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "group/add":
      return {
        ...state,
        groups: [
          ...state.groups,
          {
            key: uid(),
            id: null,
            name: "",
            hue: 210,
            collapsed: false,
            segments: [],
          },
        ],
      };

    case "group/remove": {
      const group = state.groups.find((item) => item.key === action.key);
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
        groups: state.groups.filter((item) => item.key !== action.key),
        deletedGroupIds,
        deletedSegmentIds,
      };
    }

    case "group/toggle":
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.key === action.key ? { ...group, collapsed: !group.collapsed } : group
        ),
      };

    case "group/update-name":
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.key === action.key ? { ...group, name: action.value } : group
        ),
      };

    case "group/update-hue":
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.key === action.key ? { ...group, hue: action.value } : group
        ),
      };

    case "segment/add":
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.key === action.groupKey
            ? {
                ...group,
                segments: [
                  ...group.segments,
                  {
                    key: uid(),
                    id: null,
                    name: "",
                  },
                ],
              }
            : group
        ),
      };

    case "segment/remove": {
      const deletedSegmentIds = new Set(state.deletedSegmentIds);

      return {
        ...state,
        deletedSegmentIds,
        groups: state.groups.map((group) => {
          if (group.key !== action.groupKey) return group;

          const segment = group.segments.find((item) => item.key === action.segKey);
          if (segment?.id) {
            deletedSegmentIds.add(segment.id);
          }

          return {
            ...group,
            segments: group.segments.filter((item) => item.key !== action.segKey),
          };
        }),
      };
    }

    case "segment/update-name":
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.key === action.groupKey
            ? {
                ...group,
                segments: group.segments.map((segment) =>
                  segment.key === action.segKey ? { ...segment, name: action.value } : segment
                ),
              }
            : group
        ),
      };

    default:
      return state;
  }
}

export const useManageSegmentGroups = (standard: StandardDetail) => {
  const saveSegmentsMutation = useSaveSegments();

  const [state, dispatch] = useReducer(reducer, standard, createInitialState);
  const [activeColorKey, setActiveColorKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleColorPicker = (key: string) => {
    setActiveColorKey((prev) => (prev === key ? null : key));
  };

  const addGroup = () => {
    dispatch({ type: "group/add" });
  };

  const removeGroup = (key: string) => {
    dispatch({ type: "group/remove", key });
  };

  const toggleGroup = (key: string) => {
    dispatch({ type: "group/toggle", key });
  };

  const updateGroupName = (key: string, value: string) => {
    dispatch({ type: "group/update-name", key, value });
  };

  const updateGroupHue = (key: string, value: number) => {
    dispatch({ type: "group/update-hue", key, value });
  };

  const addSegment = (groupKey: string) => {
    dispatch({ type: "segment/add", groupKey });
  };

  const removeSegment = (groupKey: string, segKey: string) => {
    dispatch({ type: "segment/remove", groupKey, segKey });
  };

  const updateSegmentName = (groupKey: string, segKey: string, value: string) => {
    dispatch({ type: "segment/update-name", groupKey, segKey, value });
  };

  const save = async () => {
    setSaving(true);

    try {
      await saveSegmentsMutation.mutateAsync({
        standardId: standard.id,
        groups: state.groups.map((group) => ({
          id: group.id ?? undefined,
          name: group.name.trim(),
          hue: group.hue,
          segments: group.segments
            .filter((s) => s.name.trim())
            .map((s) => ({
              id: s.id ?? undefined,
              name: s.name.trim(),
            })),
        })),
        deletedGroupIds: [...state.deletedGroupIds],
        deletedSegmentIds: [...state.deletedSegmentIds],
      });
      return true;
    } finally {
      setSaving(false);
    }
  };

  return {
    groups: state.groups,
    saving,
    activeColorKey,

    toggleColorPicker,
    addGroup,
    removeGroup,
    toggleGroup,
    updateGroupName,
    updateGroupHue,
    addSegment,
    removeSegment,
    updateSegmentName,
    save,
  };
};
