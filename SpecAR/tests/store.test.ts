import assert from 'node:assert/strict';
import { useProjectStore, type Dimensions } from '../store/useProjectStore';

const dimensions: Dimensions = {
  length_cm: 120,
  width_cm: 60,
  height_cm: 75,
  top_thickness_cm: 4,
  leg_thickness_cm: 5,
  leg_style: 'square',
};

useProjectStore.setState({
  currentDimensions: null,
  currentProjectName: 'New Project',
  savedProjects: [],
});

{
  useProjectStore.getState().setCurrentDimensions(dimensions, 'Dining Table');
  const state = useProjectStore.getState();

  assert.deepEqual(state.currentDimensions, dimensions);
  assert.equal(state.currentProjectName, 'Dining Table');
}

{
  useProjectStore.getState().saveProject('Dining Table', 'sample_table.csv');
  const state = useProjectStore.getState();

  assert.equal(state.savedProjects.length, 1);
  assert.equal(state.savedProjects[0].name, 'Dining Table');
  assert.equal(state.savedProjects[0].sourceFile, 'sample_table.csv');
  assert.deepEqual(state.savedProjects[0].dimensions, dimensions);
}

{
  const savedProjects = useProjectStore.getState().savedProjects;
  useProjectStore.setState({
    currentDimensions: null,
    currentProjectName: 'New Project',
    savedProjects,
  });

  assert.equal(useProjectStore.getState().savedProjects.length, 1);
}

{
  const projectId = useProjectStore.getState().savedProjects[0].id;
  useProjectStore.getState().deleteProject(projectId);

  assert.equal(useProjectStore.getState().savedProjects.length, 0);
}

{
  useProjectStore.getState().clearCurrentDimensions();
  const state = useProjectStore.getState();

  assert.equal(state.currentDimensions, null);
  assert.equal(state.currentProjectName, 'New Project');
}

console.log('store tests passed');
