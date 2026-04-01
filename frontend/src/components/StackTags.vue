<template>
  <div class="d-inline-flex flex-wrap gap-1 align-items-center">
    <span
      v-for="t in tags"
      :key="t.tag"
      class="badge rounded-pill"
      :style="{ backgroundColor: t.color }"
    >
      {{ t.tag }}
      <button
        v-if="editable"
        type="button"
        class="btn-close btn-close-white ms-1"
        style="font-size: 0.5em;"
        @click.stop="removeTag(t.tag)"
      />
    </span>
    <button
      v-if="editable && !showInput"
      class="btn btn-sm btn-normal py-0 px-2"
      style="font-size: 0.75em;"
      @click.stop="showInput = true"
    >
      <font-awesome-icon icon="plus" class="me-1" />Tag
    </button>
    <span v-if="showInput" class="d-inline-flex gap-1">
      <input
        ref="tagInput"
        v-model="newTag"
        class="form-control form-control-sm"
        style="width: 100px;"
        placeholder="tag name"
        @keyup.enter="addTag"
        @keyup.esc="showInput = false"
      />
      <input v-model="newColor" type="color" class="form-control form-control-color form-control-sm" style="width: 38px; padding: 2px;" />
      <button class="btn btn-sm btn-primary" @click="addTag">Add</button>
      <button class="btn btn-sm btn-normal" @click="showInput = false">Cancel</button>
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent, nextTick } from "vue";
export default defineComponent({
  name: "StackTags",
  props: {
    stackName: { type: String, required: true },
    editable: { type: Boolean, default: false },
  },
  data() { return { tags: [] as { tag: string; color: string }[], showInput: false, newTag: "", newColor: "#74c2ff" }; },
  watch: {
    showInput(v) { if (v) nextTick(() => (this.$refs.tagInput as HTMLInputElement)?.focus()); },
  },
  mounted() { this.load(); },
  methods: {
    load() {
      (this.$root as any)?.getSocket().emit("getStackTags", this.stackName, (res: any) => {
        if (res.ok) this.tags = res.tags;
      });
    },
    addTag() {
      if (!this.newTag.trim()) return;
      const updated = [...this.tags, { tag: this.newTag.trim(), color: this.newColor }];
      (this.$root as any)?.getSocket().emit("setStackTags", this.stackName, updated, (res: any) => {
        if (res.ok) { this.tags = updated; this.newTag = ""; this.showInput = false; }
      });
    },
    removeTag(tag: string) {
      (this.$root as any)?.getSocket().emit("removeStackTag", this.stackName, tag, (res: any) => {
        if (res.ok) this.tags = this.tags.filter((t) => t.tag !== tag);
      });
    },
  },
});
</script>
