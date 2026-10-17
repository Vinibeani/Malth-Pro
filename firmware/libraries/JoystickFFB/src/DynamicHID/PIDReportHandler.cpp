#include "PIDReportHandler.h"

PIDReportHandler::PIDReportHandler() 
{
	nextEID = 1;
	devicePaused = 0;
	FreeAllEffects();
	deviceGain.gain = 255;
}

PIDReportHandler::~PIDReportHandler() 
{
	FreeAllEffects();
}

uint8_t PIDReportHandler::GetNextFreeEffect(void)
{
	for (uint8_t id = 1; id <= MAX_EFFECTS; ++id) {
		if (g_EffectStates[id].state == MEFFECTSTATE_FREE) {
			g_EffectStates[id].state = MEFFECTSTATE_ALLOCATED; return id;
		}
	}
	return 0;
}

void PIDReportHandler::StopAllEffects(void)
{
	for (uint8_t id = 0; id <= MAX_EFFECTS; id++)
		StopEffect(id);
}

void PIDReportHandler::StartEffect(uint8_t id)
{
	if (!id || id > MAX_EFFECTS || !g_EffectStates[id].state)
		return;
	g_EffectStates[id].state = MEFFECTSTATE_PLAYING;
	g_EffectStates[id].elapsedTime = 0;
	g_EffectStates[id].startTime = millis();
}

void PIDReportHandler::StopEffect(uint8_t id)
{
	if (id > MAX_EFFECTS)
		return;
	if (g_EffectStates[id].state) g_EffectStates[id].state = MEFFECTSTATE_ALLOCATED;
}

void PIDReportHandler::FreeEffect(uint8_t id)
{
	if (id > MAX_EFFECTS)
		return;
	if (g_EffectStates[id].state) pidBlockLoad.ramPoolAvailable += SIZE_EFFECT;
	g_EffectStates[id].state = 0;
	if (id < nextEID)
		nextEID = id;
}

void PIDReportHandler::FreeAllEffects(void)
{
	nextEID = 1;
	memset((void*)& g_EffectStates, 0, sizeof(g_EffectStates));
	pidBlockLoad.ramPoolAvailable = MEMORY_SIZE;
}

void PIDReportHandler::EffectOperation(USB_FFBReport_EffectOperation_Output_Data_t* data)
{
	if (!data->effectBlockIndex || data->effectBlockIndex > MAX_EFFECTS || !g_EffectStates[data->effectBlockIndex].state) return;
	if (data->operation == 1 || data->operation == 2)
		g_EffectStates[data->effectBlockIndex].loopCount = data->loopCount ? data->loopCount : 1;
	if (data->operation == 1)
	{ // Start
		StartEffect(data->effectBlockIndex);
	}
	else if (data->operation == 2)
	{ // StartSolo

	  // Stop all first
		StopAllEffects();
		// Then start the given effect
		StartEffect(data->effectBlockIndex);
	}
	else if (data->operation == 3)
	{ // Stop
		StopEffect(data->effectBlockIndex);
	}
	else
	{
	}
}

void PIDReportHandler::BlockFree(USB_FFBReport_BlockFree_Output_Data_t* data)
{
	uint8_t eid = data->effectBlockIndex;

	if (eid == 0xFF)
	{ // all effects
		FreeAllEffects();
	}
	else
	{
		FreeEffect(eid);
	}
}

void PIDReportHandler::DeviceControl(USB_FFBReport_DeviceControl_Output_Data_t* data)
{

	uint8_t control = data->control;

	if (control == 0x01)
	{ // 1=Enable Actuators
		pidState.status |= 2;
	}
	else if (control == 0x02)
	{ // 2=Disable Actuators
		pidState.status &= ~(0x02);
	}
	else if (control == 0x03)
	{ // 3=Stop All Effects
		StopAllEffects();
	}
	else if (control == 0x04)
	{ //  4=Reset
		FreeAllEffects();
		pidState.status &= ~2;
		devicePaused = 0;
	}
	else if (control == 0x05)
	{ // 5=Pause
		devicePaused = 1;
		pidState.status |= 1;
	}
	else if (control == 0x06)
	{ // 6=Continue
		devicePaused = 0;
		pidState.status &= ~1;
	}
	else if (control & (0xFF - 0x3F))
	{
	}
}

void PIDReportHandler::DeviceGain(USB_FFBReport_DeviceGain_Output_Data_t* data)
{
	deviceGain.gain = data->gain;
}

void PIDReportHandler::SetCustomForce(USB_FFBReport_SetCustomForce_Output_Data_t* data)
{
}

void PIDReportHandler::SetCustomForceData(USB_FFBReport_SetCustomForceData_Output_Data_t* data)
{
}

void PIDReportHandler::SetDownloadForceSample(USB_FFBReport_SetDownloadForceSample_Output_Data_t* data)
{
}

void PIDReportHandler::SetEffect(USB_FFBReport_SetEffect_Output_Data_t* data)
{
	volatile TEffectState* effect = &g_EffectStates[data->effectBlockIndex];

	effect->duration = data->duration;
	effect->directionX = data->directionX;
	effect->directionY = data->directionY;
	effect->effectType = data->effectType;
	effect->gain = data->gain;
	effect->enableAxis = data->enableAxis;
}

void PIDReportHandler::SetEnvelope(USB_FFBReport_SetEnvelope_Output_Data_t* data, volatile TEffectState* effect)
{
	effect->attackLevel = data->attackLevel;
	effect->fadeLevel = data->fadeLevel;
	effect->attackTime = data->attackTime;
	effect->fadeTime = data->fadeTime;
}

void PIDReportHandler::SetCondition(USB_FFBReport_SetCondition_Output_Data_t* data, volatile TEffectState* effect)
{
	uint8_t axis = data->parameterBlockOffset & 0x0f;
	if (axis >= MAX_FFB_AXIS_COUNT) return;
    effect->conditions[axis].cpOffset = data->cpOffset;
    effect->conditions[axis].positiveCoefficient = data->positiveCoefficient;
    effect->conditions[axis].negativeCoefficient = data->negativeCoefficient;
    effect->conditions[axis].positiveSaturation = data->positiveSaturation;
    effect->conditions[axis].negativeSaturation = data->negativeSaturation;
    effect->conditions[axis].deadBand = data->deadBand;
	if (effect->conditionBlocksCount < axis + 1) effect->conditionBlocksCount = axis + 1;
}

void PIDReportHandler::SetPeriodic(USB_FFBReport_SetPeriodic_Output_Data_t* data, volatile TEffectState* effect)
{
	effect->magnitude = data->magnitude;
	effect->offset = data->offset;
	effect->phase = data->phase;
	effect->period = data->period ? min(data->period, (uint32_t)65535) : 1;
}

void PIDReportHandler::SetConstantForce(USB_FFBReport_SetConstantForce_Output_Data_t* data, volatile TEffectState* effect)
{
	//  ReportPrint(*effect);
	effect->magnitude = data->magnitude;
}

void PIDReportHandler::SetRampForce(USB_FFBReport_SetRampForce_Output_Data_t* data, volatile TEffectState* effect)
{
	effect->startMagnitude = data->startMagnitude;
	effect->endMagnitude = data->endMagnitude;
}

void PIDReportHandler::CreateNewEffect(USB_FFBReport_CreateNewEffect_Feature_Data_t* inData)
{
	pidBlockLoad.reportId = 6;
	if (!inData->effectType || inData->effectType >= USB_EFFECT_CUSTOM) {
		pidBlockLoad.effectBlockIndex = 0; pidBlockLoad.loadStatus = 3; return;
	}
	pidBlockLoad.effectBlockIndex = GetNextFreeEffect();

	if (pidBlockLoad.effectBlockIndex == 0)
	{
		pidBlockLoad.loadStatus = 2;    // 1=Success,2=Full,3=Error
	}
	else
	{
		pidBlockLoad.loadStatus = 1;    // 1=Success,2=Full,3=Error

		volatile TEffectState* effect = &g_EffectStates[pidBlockLoad.effectBlockIndex];

		memset((void*)effect, 0, sizeof(TEffectState));
		effect->state = MEFFECTSTATE_ALLOCATED;
		effect->effectType = inData->effectType;
		effect->gain = 255;
		pidBlockLoad.ramPoolAvailable -= SIZE_EFFECT;
	}
}

void PIDReportHandler::UppackUsbData(uint8_t* data, uint16_t len)
{
	// Conferir o tamanho ANTES de acessar o indice ou converter a estrutura.
	if (len < 2) return;
	uint8_t minimum = 0;
	switch (data[0]) {
		case 1: minimum = sizeof(USB_FFBReport_SetEffect_Output_Data_t) + 4; break;
		case 2: minimum = sizeof(USB_FFBReport_SetEnvelope_Output_Data_t); break;
		case 3: minimum = sizeof(USB_FFBReport_SetCondition_Output_Data_t); break;
		case 4: minimum = sizeof(USB_FFBReport_SetPeriodic_Output_Data_t); break;
		case 5: minimum = sizeof(USB_FFBReport_SetConstantForce_Output_Data_t); break;
		case 6: minimum = sizeof(USB_FFBReport_SetRampForce_Output_Data_t); break;
		case 10: minimum = sizeof(USB_FFBReport_EffectOperation_Output_Data_t); break;
		case 11: case 12: case 13: minimum = 2; break;
		default: return;
	}
	if (len < minimum) return;
	if (data[0] != 12 && data[0] != 13 && !(data[0] == 11 && data[1] == 0xff) &&
	    (!data[1] || data[1] > MAX_EFFECTS || !g_EffectStates[data[1]].state)) return;
	//Serial.print("len:");
	//Serial.println(len);
	uint8_t effectId = data[1]; // effectBlockIndex is always the second byte.
	//Serial.println("eid:");
	//Serial.println(effectId);
	switch (data[0])    // reportID
	{
	case 1:
		//Serial.println("SetEffect");
		SetEffect((USB_FFBReport_SetEffect_Output_Data_t*)data);
		break;
	case 2:
		//Serial.println("SetEnvelop");
		SetEnvelope((USB_FFBReport_SetEnvelope_Output_Data_t*)data, &g_EffectStates[effectId]);
		break;
	case 3:
		//Serial.println("SetCondition");
		SetCondition((USB_FFBReport_SetCondition_Output_Data_t*)data, &g_EffectStates[effectId]);
		break;
	case 4:
		//Serial.println("SetPeriodic");
		SetPeriodic((USB_FFBReport_SetPeriodic_Output_Data_t*)data, &g_EffectStates[effectId]);
		break;
	case 5:
		//Serial.println("SetConstantForce");
		SetConstantForce((USB_FFBReport_SetConstantForce_Output_Data_t*)data, &g_EffectStates[effectId]);
		break;
	case 6:
		//Serial.println("SetRampForce");
		SetRampForce((USB_FFBReport_SetRampForce_Output_Data_t*)data, &g_EffectStates[effectId]);
		break;
	case 7:
		//Serial.println("SetCustomForceData");
		SetCustomForceData((USB_FFBReport_SetCustomForceData_Output_Data_t*)data);
		break;
	case 8:
		//Serial.println("SetDownloadForceSample");
		SetDownloadForceSample((USB_FFBReport_SetDownloadForceSample_Output_Data_t*)data);
		break;
	case 9:
		break;
	case 10:
		//Serial.println("EffectOperation");
		EffectOperation((USB_FFBReport_EffectOperation_Output_Data_t*)data);
		break;
	case 11:
		//Serial.println("BlockFree");
		BlockFree((USB_FFBReport_BlockFree_Output_Data_t*)data);
		break;
	case 12:
		//Serial.println("DeviceControl");
		DeviceControl((USB_FFBReport_DeviceControl_Output_Data_t*)data);
		break;
	case 13:
		//Serial.println("DeviceGain");
		DeviceGain((USB_FFBReport_DeviceGain_Output_Data_t*)data);
		break;
	case 14:
		//Serial.println("SetCustomForce");
		SetCustomForce((USB_FFBReport_SetCustomForce_Output_Data_t*)data);
		break;
	default:
		break;
	}
}

uint8_t* PIDReportHandler::getPIDPool()
{
	FreeAllEffects();

	pidPoolReport.reportId = 7;
	pidPoolReport.ramPoolSize = MEMORY_SIZE;
	pidPoolReport.maxSimultaneousEffects = MAX_EFFECTS;
	pidPoolReport.memoryManagement = 3;
	return (uint8_t*)& pidPoolReport;
}

uint8_t* PIDReportHandler::getPIDBlockLoad()
{
	return (uint8_t*)& pidBlockLoad;
}

uint8_t* PIDReportHandler::getPIDStatus()
{
	pidState.effectBlockIndex = 0;
	for (uint8_t id = 1; id <= MAX_EFFECTS; ++id) {
		if (g_EffectStates[id].state == MEFFECTSTATE_PLAYING) { pidState.effectBlockIndex = (id << 1) | 1; break; }
	}
	return (uint8_t*)& pidState;
}
